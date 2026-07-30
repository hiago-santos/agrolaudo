import type { Prisma, PrismaClient } from '@prisma/client';

import { NotFoundError } from '../../lib/errors.js';

export async function listarAtividades(
  prisma: PrismaClient,
  filtros: { ativo?: boolean; pecuaria?: boolean },
) {
  const where: Prisma.AtividadeWhereInput = {
    ...(filtros.ativo !== undefined && { ativo: filtros.ativo }),
    ...(filtros.pecuaria !== undefined && { pecuaria: filtros.pecuaria }),
  };
  return prisma.atividade.findMany({ where, orderBy: { ordem: 'asc' } });
}

export async function obterAtividade(prisma: PrismaClient, id: string) {
  const atividade = await prisma.atividade.findUnique({ where: { id } });
  if (!atividade) throw new NotFoundError('Atividade');
  return atividade;
}
