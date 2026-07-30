import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';

import { NotFoundError, ValidationError } from '../../lib/errors.js';

import type { itemCotacaoInputSchema } from './cotacoes.schemas.js';
import type { z } from 'zod';

type ItemCotacaoInput = z.infer<typeof itemCotacaoInputSchema>;

/**
 * Matriz atual = última CotacaoRef (maior vigenteDesde) por atividade. O histórico
 * completo nunca é sobrescrito — ver o comentário no schema.prisma sobre CotacaoRef
 * ser append-only.
 */
export async function obterMatrizAtual(prisma: PrismaClient) {
  const atividades = await prisma.atividade.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });

  const cotacoes = await prisma.cotacaoRef.findMany({
    where: { atividadeId: { in: atividades.map((a) => a.id) } },
    orderBy: { vigenteDesde: 'desc' },
  });

  const maisRecentePorAtividade = new Map<string, (typeof cotacoes)[number]>();
  for (const cotacao of cotacoes) {
    if (!maisRecentePorAtividade.has(cotacao.atividadeId)) {
      maisRecentePorAtividade.set(cotacao.atividadeId, cotacao);
    }
  }

  return atividades.map((atividade) => ({
    atividade,
    cotacaoAtual: maisRecentePorAtividade.get(atividade.id) ?? null,
  }));
}

export async function historicoDaAtividade(prisma: PrismaClient, atividadeId: string) {
  const atividade = await prisma.atividade.findUnique({ where: { id: atividadeId } });
  if (!atividade) throw new NotFoundError('Atividade');

  const historico = await prisma.cotacaoRef.findMany({
    where: { atividadeId },
    orderBy: { vigenteDesde: 'desc' },
  });

  return { atividade, historico };
}

/** "[Salvar Novas Cotações]" — insere uma nova linha por atividade (nunca sobrescreve). */
export async function atualizarCotacoes(
  prisma: PrismaClient,
  itens: ItemCotacaoInput[],
  criadoPorId?: string,
) {
  const atividades = await prisma.atividade.findMany({
    where: { id: { in: itens.map((item) => item.atividadeId) } },
  });
  const atividadePorId = new Map(atividades.map((a) => [a.id, a]));

  for (const item of itens) {
    const atividade = atividadePorId.get(item.atividadeId);
    if (!atividade) throw new NotFoundError(`Atividade ${item.atividadeId}`);
    if (!atividade.unidadesPermitidas.includes(item.unidade)) {
      throw new ValidationError(`Unidade "${item.unidade}" não é válida para ${atividade.nome}.`);
    }
  }

  return prisma.$transaction(
    itens.map((item) =>
      prisma.cotacaoRef.create({
        data: {
          atividadeId: item.atividadeId,
          unidade: item.unidade,
          precoUnitario: item.precoUnitario,
          custoPorHa: item.custoPorHa,
          regiao: item.regiao,
          criadoPorId,
        },
      }),
    ),
  );
}

const COLUNAS_EXPORT = [
  { header: 'Slug', key: 'slug', width: 30 },
  { header: 'Atividade', key: 'nome', width: 32 },
  { header: 'Unidade', key: 'unidade', width: 16 },
  { header: 'Preço Unitário (R$)', key: 'preco', width: 20 },
  { header: 'Custo/ha (R$)', key: 'custo', width: 18 },
] as const;

export async function exportarMatrizXlsx(prisma: PrismaClient): Promise<Buffer> {
  const matriz = await obterMatrizAtual(prisma);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Matriz de Preços');
  sheet.columns = [...COLUNAS_EXPORT];
  sheet.getRow(1).font = { bold: true };

  for (const { atividade, cotacaoAtual } of matriz) {
    sheet.addRow({
      slug: atividade.slug,
      nome: atividade.nome,
      unidade: cotacaoAtual?.unidade ?? atividade.unidadePadrao,
      preco: cotacaoAtual ? Number(cotacaoAtual.precoUnitario) : 0,
      custo: cotacaoAtual ? Number(cotacaoAtual.custoPorHa) : 0,
    });
  }

  sheet.getColumn('preco').numFmt = '"R$" #,##0.00';
  sheet.getColumn('custo').numFmt = '"R$" #,##0.00';

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface ResultadoImportacao {
  atualizados: number;
  ignorados: string[];
}

/** Reimporta a planilha baixada em /cotacoes/export.xlsx — casa pela coluna Slug. */
export async function importarMatrizXlsx(
  prisma: PrismaClient,
  buffer: Buffer,
  criadoPorId?: string,
): Promise<ResultadoImportacao> {
  const workbook = new ExcelJS.Workbook();
  // O `.d.ts` do ExcelJS declara um `Buffer` próprio (local ao módulo, `extends
  // ArrayBuffer`) que colide estruturalmente com o Buffer genérico do @types/node
  // atual. `as never` só contorna essa checagem de tipos — em runtime é o mesmo
  // Buffer do Node dos dois lados.
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ValidationError('Planilha vazia ou em formato inesperado.');

  const atividades = await prisma.atividade.findMany();
  const atividadePorSlug = new Map(atividades.map((a) => [a.slug, a]));

  const linhasValidas: Array<{
    atividadeId: string;
    unidade: string;
    precoUnitario: number;
    custoPorHa: number;
  }> = [];
  const ignorados: string[] = [];

  sheet.eachRow((row, numeroLinha) => {
    if (numeroLinha === 1) return; // cabeçalho

    const slug = String(row.getCell(1).value ?? '').trim();
    const unidade = String(row.getCell(3).value ?? '').trim();
    const preco = Number(row.getCell(4).value);
    const custo = Number(row.getCell(5).value);

    const atividade = atividadePorSlug.get(slug);
    const linhaValida = atividade && unidade && Number.isFinite(preco) && Number.isFinite(custo);

    if (!linhaValida) {
      ignorados.push(`linha ${numeroLinha}`);
      return;
    }

    linhasValidas.push({ atividadeId: atividade.id, unidade, precoUnitario: preco, custoPorHa: custo });
  });

  if (linhasValidas.length > 0) {
    await prisma.$transaction(
      linhasValidas.map((linha) =>
        prisma.cotacaoRef.create({ data: { ...linha, criadoPorId } }),
      ),
    );
  }

  return { atualizados: linhasValidas.length, ignorados };
}
