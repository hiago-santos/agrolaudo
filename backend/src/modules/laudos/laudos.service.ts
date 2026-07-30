import type { Prisma, PrismaClient, StatusLaudo } from '@prisma/client';

import { consolidar } from '../../core/calculadora.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import type { LaudoDocumentoDados } from '../../report/types.js';

import { calcularItensDoLaudo, type ItemLaudoInput } from './calculo.util.js';
import { proximoNumeroLaudo } from './numeracao.js';

export interface CriarLaudoInput {
  produtorId: string;
  propriedadeId: string;
  safraId: string;
  agronomoId: string;
  cidadeEmissao?: string;
  observacoes?: string;
  itens: ItemLaudoInput[];
}

export interface AtualizarLaudoInput {
  cidadeEmissao?: string;
  observacoes?: string;
  itens?: ItemLaudoInput[];
}

export interface ListarLaudosFiltros {
  busca?: string;
  produtorId?: string;
  safraId?: string;
  agronomoId?: string;
  status?: StatusLaudo;
  page: number;
  pageSize: number;
}

const LAUDO_DETALHE_INCLUDE = {
  produtor: true,
  propriedade: true,
  safra: true,
  agronomo: true,
  itens: { orderBy: { ordem: 'asc' as const } },
  assinaturas: true,
} satisfies Prisma.LaudoInclude;

/** Shape completo consumido pelos geradores de documento (backend/src/report/). */
export type LaudoCompleto = Prisma.LaudoGetPayload<{ include: typeof LAUDO_DETALHE_INCLUDE }>;

const LAUDO_LISTA_INCLUDE = {
  produtor: { select: { id: true, nome: true, cpfCnpj: true } },
  propriedade: { select: { id: true, nome: true, matricula: true } },
  safra: { select: { id: true, rotulo: true } },
  agronomo: { select: { id: true, nome: true, crea: true } },
} satisfies Prisma.LaudoInclude;

function itensParaCreateInput(
  itensCalculados: Awaited<ReturnType<typeof calcularItensDoLaudo>>,
): Prisma.LaudoItemCreateWithoutLaudoInput[] {
  return itensCalculados.map(({ atividade, unidade, input, resultado }, ordem) => ({
    atividade: { connect: { id: atividade.id } },
    atividadeNome: atividade.nome,
    unidade,
    areaHa: input.areaHa,
    produtividade: input.produtividade,
    precoUnitario: input.precoUnitario,
    custoPorHa: input.custoPorHa,
    rebanhoCabecas: input.rebanhoCabecas ?? null,
    producaoTotal: resultado.producaoTotal,
    faturamentoBruto: resultado.faturamentoBruto,
    custoTotal: resultado.custoTotal,
    receitaLiquida: resultado.receitaLiquida,
    produtividadePorHa: resultado.produtividadePorHa,
    taxaLotacao: resultado.taxaLotacao,
    ordem,
  }));
}

export async function listarLaudos(prisma: PrismaClient, filtros: ListarLaudosFiltros) {
  const where: Prisma.LaudoWhereInput = {
    ...(filtros.produtorId && { produtorId: filtros.produtorId }),
    ...(filtros.safraId && { safraId: filtros.safraId }),
    ...(filtros.agronomoId && { agronomoId: filtros.agronomoId }),
    ...(filtros.status && { status: filtros.status }),
    ...(filtros.busca && {
      OR: [
        { numero: { contains: filtros.busca, mode: 'insensitive' } },
        { produtor: { nome: { contains: filtros.busca, mode: 'insensitive' } } },
        { produtor: { cpfCnpj: { contains: filtros.busca } } },
        { propriedade: { nome: { contains: filtros.busca, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.laudo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filtros.page - 1) * filtros.pageSize,
      take: filtros.pageSize,
      include: LAUDO_LISTA_INCLUDE,
    }),
    prisma.laudo.count({ where }),
  ]);

  return { items, total, page: filtros.page, pageSize: filtros.pageSize };
}

export async function obterLaudo(prisma: PrismaClient, id: string) {
  const laudo = await prisma.laudo.findUnique({ where: { id }, include: LAUDO_DETALHE_INCLUDE });
  if (!laudo) throw new NotFoundError('Laudo');
  return laudo;
}

/** Alimenta o preview em tela — calcula sem persistir nada. */
export async function calcularLaudo(prisma: PrismaClient, itensInput: ItemLaudoInput[]) {
  const itens = await calcularItensDoLaudo(prisma, itensInput);
  const consolidado = consolidar(itens.map((item) => item.resultado));

  return {
    itens: itens.map(({ atividade, unidade, resultado }) => ({
      atividadeId: atividade.id,
      atividadeNome: atividade.nome,
      unidade,
      ...resultado,
    })),
    consolidado,
  };
}

async function validarReferencias(
  prisma: PrismaClient,
  input: Pick<CriarLaudoInput, 'produtorId' | 'propriedadeId' | 'safraId' | 'agronomoId'>,
) {
  const [produtor, propriedade, safra, agronomo] = await Promise.all([
    prisma.produtor.findUnique({ where: { id: input.produtorId } }),
    prisma.propriedade.findUnique({ where: { id: input.propriedadeId } }),
    prisma.safra.findUnique({ where: { id: input.safraId } }),
    prisma.agronomo.findUnique({ where: { id: input.agronomoId } }),
  ]);
  if (!produtor) throw new NotFoundError('Produtor');
  if (!propriedade) throw new NotFoundError('Propriedade');
  if (propriedade.produtorId !== produtor.id) {
    throw new ValidationError('Essa propriedade não pertence ao produtor informado.');
  }
  if (!safra) throw new NotFoundError('Safra');
  if (!agronomo) throw new NotFoundError('Agrônomo');
  return { produtor, propriedade, safra, agronomo };
}

/**
 * Monta o documento (mesmo shape usado pelo XLSX/PDF/preview persistido) SEM
 * gravar nada — é o que alimenta o `<iframe>` do Passo 3 do formulário antes de o
 * agrônomo confirmar "Concluir e Gerar", reusando a mesma validação e o mesmo
 * motor de cálculo de `criarLaudo`.
 */
export async function montarPreviewDocumento(
  prisma: PrismaClient,
  input: CriarLaudoInput,
): Promise<LaudoDocumentoDados> {
  const { produtor, propriedade, safra, agronomo } = await validarReferencias(prisma, input);

  const itensCalculados = await calcularItensDoLaudo(prisma, input.itens);
  const consolidado = consolidar(itensCalculados.map((item) => item.resultado));

  return {
    numero: 'PRÉVIA (não emitido)',
    status: 'RASCUNHO',
    cidadeEmissao: input.cidadeEmissao ?? agronomo.cidadeEmissao,
    dataEmissao: new Date().toISOString(),
    observacoes: input.observacoes ?? null,
    produtor: {
      nome: produtor.nome,
      cpfCnpj: produtor.cpfCnpj,
      municipio: produtor.municipio,
      uf: produtor.uf,
    },
    propriedade: {
      nome: propriedade.nome,
      matricula: propriedade.matricula,
      municipio: propriedade.municipio,
      uf: propriedade.uf,
      areaTotalHa: propriedade.areaTotalHa.toString(),
    },
    safra: { rotulo: safra.rotulo },
    agronomo: { nome: agronomo.nome, crea: agronomo.crea, cidadeEmissao: agronomo.cidadeEmissao },
    itens: itensCalculados.map(({ atividade, unidade, resultado }) => ({
      atividadeNome: atividade.nome,
      unidade,
      ...resultado,
    })),
    totalFaturamento: consolidado.totalFaturamento,
    totalCusto: consolidado.totalCusto,
    totalReceita: consolidado.totalReceita,
    margemPercentual: consolidado.margemPercentual,
    assinaturas: [],
  };
}

export async function criarLaudo(prisma: PrismaClient, input: CriarLaudoInput) {
  const { propriedade, safra, agronomo } = await validarReferencias(prisma, input);

  const itensCalculados = await calcularItensDoLaudo(prisma, input.itens);
  const consolidado = consolidar(itensCalculados.map((item) => item.resultado));

  return prisma.$transaction(async (tx) => {
    const ano = new Date().getFullYear();
    const numero = await proximoNumeroLaudo(tx, ano);

    return tx.laudo.create({
      data: {
        numero,
        produtor: { connect: { id: propriedade.produtorId } },
        propriedade: { connect: { id: propriedade.id } },
        safra: { connect: { id: safra.id } },
        agronomo: { connect: { id: agronomo.id } },
        cidadeEmissao: input.cidadeEmissao ?? agronomo.cidadeEmissao,
        observacoes: input.observacoes,
        totalFaturamento: consolidado.totalFaturamento,
        totalCusto: consolidado.totalCusto,
        totalReceita: consolidado.totalReceita,
        margemPercentual: consolidado.margemPercentual,
        itens: { create: itensParaCreateInput(itensCalculados) },
      },
      include: LAUDO_DETALHE_INCLUDE,
    });
  });
}

export async function atualizarLaudo(prisma: PrismaClient, id: string, input: AtualizarLaudoInput) {
  const laudo = await obterLaudo(prisma, id);
  if (laudo.status !== 'RASCUNHO') {
    throw new ConflictError(
      'Só é possível editar laudos em rascunho. Para corrigir um laudo já assinado, duplique-o.',
    );
  }

  if (!input.itens) {
    return prisma.laudo.update({
      where: { id },
      data: { cidadeEmissao: input.cidadeEmissao, observacoes: input.observacoes },
      include: LAUDO_DETALHE_INCLUDE,
    });
  }

  const itensCalculados = await calcularItensDoLaudo(prisma, input.itens);
  const consolidado = consolidar(itensCalculados.map((item) => item.resultado));

  return prisma.$transaction(async (tx) => {
    await tx.laudoItem.deleteMany({ where: { laudoId: id } });
    return tx.laudo.update({
      where: { id },
      data: {
        cidadeEmissao: input.cidadeEmissao,
        observacoes: input.observacoes,
        totalFaturamento: consolidado.totalFaturamento,
        totalCusto: consolidado.totalCusto,
        totalReceita: consolidado.totalReceita,
        margemPercentual: consolidado.margemPercentual,
        itens: { create: itensParaCreateInput(itensCalculados) },
      },
      include: LAUDO_DETALHE_INCLUDE,
    });
  });
}

export async function cancelarLaudo(prisma: PrismaClient, id: string) {
  await obterLaudo(prisma, id);
  return prisma.laudo.update({
    where: { id },
    data: { status: 'CANCELADO' },
    include: LAUDO_DETALHE_INCLUDE,
  });
}

/**
 * Duplica para a próxima safra: mantém área/produtividade/rebanho (o que tende a
 * repetir de uma safra para outra) mas repuxa preço/custo ATUAIS da matriz — não
 * faz sentido reemitir com uma cotação de meses atrás.
 */
export async function duplicarLaudo(prisma: PrismaClient, id: string, novaSafraId: string) {
  const original = await obterLaudo(prisma, id);
  const novaSafra = await prisma.safra.findUnique({ where: { id: novaSafraId } });
  if (!novaSafra) throw new NotFoundError('Safra');

  const itensInput: ItemLaudoInput[] = await Promise.all(
    original.itens.map(async (item) => {
      const cotacaoAtual = await prisma.cotacaoRef.findFirst({
        where: { atividadeId: item.atividadeId },
        orderBy: { vigenteDesde: 'desc' },
      });
      return {
        atividadeId: item.atividadeId,
        unidade: item.unidade,
        areaHa: Number(item.areaHa),
        produtividade: Number(item.produtividade),
        precoUnitario: cotacaoAtual ? Number(cotacaoAtual.precoUnitario) : Number(item.precoUnitario),
        custoPorHa: cotacaoAtual ? Number(cotacaoAtual.custoPorHa) : Number(item.custoPorHa),
        rebanhoCabecas: item.rebanhoCabecas ? Number(item.rebanhoCabecas) : undefined,
      };
    }),
  );

  return criarLaudo(prisma, {
    produtorId: original.produtorId,
    propriedadeId: original.propriedadeId,
    safraId: novaSafraId,
    agronomoId: original.agronomoId,
    cidadeEmissao: original.cidadeEmissao,
    observacoes: original.observacoes ?? undefined,
    itens: itensInput,
  });
}
