import type { Atividade, PrismaClient } from '@prisma/client';

import { calcularItem, type ItemCalculoResultado } from '../../core/calculadora.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export interface ItemLaudoInput {
  atividadeId: string;
  unidade?: string;
  areaHa: number;
  produtividade: number;
  precoUnitario: number;
  custoPorHa: number;
  rebanhoCabecas?: number;
}

export interface ItemLaudoCalculado {
  atividade: Atividade;
  unidade: string;
  input: ItemLaudoInput;
  resultado: ItemCalculoResultado;
}

/**
 * Valida cada item contra o catálogo de atividades (existe? a unidade escolhida é
 * permitida para ela?) e roda o motor puro (core.calcularItem) — usado tanto pelo
 * preview (`/laudos/calcular`) quanto pela persistência (`criarLaudo`), então os
 * dois caminhos NUNCA podem calcular números diferentes para o mesmo input.
 */
export async function calcularItensDoLaudo(
  prisma: PrismaClient,
  itensInput: ItemLaudoInput[],
): Promise<ItemLaudoCalculado[]> {
  if (itensInput.length === 0) {
    throw new ValidationError('O laudo precisa de pelo menos uma atividade.');
  }

  const atividades = await prisma.atividade.findMany({
    where: { id: { in: itensInput.map((item) => item.atividadeId) } },
  });
  const atividadePorId = new Map(atividades.map((atividade) => [atividade.id, atividade]));

  return itensInput.map((input) => {
    const atividade = atividadePorId.get(input.atividadeId);
    if (!atividade) throw new NotFoundError(`Atividade ${input.atividadeId}`);

    const unidade = input.unidade ?? atividade.unidadePadrao;
    if (!atividade.unidadesPermitidas.includes(unidade)) {
      throw new ValidationError(`Unidade "${unidade}" não é válida para ${atividade.nome}.`);
    }

    const resultado = calcularItem({
      areaHa: input.areaHa,
      produtividade: input.produtividade,
      precoUnitario: input.precoUnitario,
      custoPorHa: input.custoPorHa,
      rebanhoCabecas: atividade.pecuaria ? (input.rebanhoCabecas ?? null) : null,
    });

    return { atividade, unidade, input, resultado };
  });
}
