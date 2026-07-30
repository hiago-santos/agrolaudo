import type { Prisma, PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../lib/errors.js';

import type {
  atualizarPropriedadeBodySchema,
  criarPropriedadeBodySchema,
} from './propriedades.schemas.js';
import type { z } from 'zod';

type CriarPropriedadeInput = z.infer<typeof criarPropriedadeBodySchema>;
type AtualizarPropriedadeInput = z.infer<typeof atualizarPropriedadeBodySchema>;

export async function listarPropriedades(
  prisma: PrismaClient,
  params: { produtorId?: string; busca?: string; page: number; pageSize: number },
) {
  const where: Prisma.PropriedadeWhereInput = {
    ...(params.produtorId && { produtorId: params.produtorId }),
    ...(params.busca && {
      OR: [
        { nome: { contains: params.busca, mode: 'insensitive' } },
        { matricula: { contains: params.busca, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.propriedade.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { produtor: { select: { id: true, nome: true, cpfCnpj: true } } },
    }),
    prisma.propriedade.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function obterPropriedade(prisma: PrismaClient, id: string) {
  const propriedade = await prisma.propriedade.findUnique({
    where: { id },
    include: { produtor: true },
  });
  if (!propriedade) throw new NotFoundError('Propriedade');
  return propriedade;
}

async function garantirMatriculaUnica(
  prisma: PrismaClient,
  produtorId: string,
  matricula: string,
  ignorarId?: string,
) {
  const existente = await prisma.propriedade.findUnique({
    where: { produtorId_matricula: { produtorId, matricula } },
  });
  if (existente && existente.id !== ignorarId) {
    throw new ConflictError(`Esse produtor já tem uma propriedade com a matrícula ${matricula}.`);
  }
}

export async function criarPropriedade(prisma: PrismaClient, data: CriarPropriedadeInput) {
  const produtor = await prisma.produtor.findUnique({ where: { id: data.produtorId } });
  if (!produtor) throw new NotFoundError('Produtor');

  await garantirMatriculaUnica(prisma, data.produtorId, data.matricula);

  return prisma.propriedade.create({ data });
}

export async function atualizarPropriedade(
  prisma: PrismaClient,
  id: string,
  data: AtualizarPropriedadeInput,
) {
  const propriedade = await obterPropriedade(prisma, id);

  if (data.matricula) {
    await garantirMatriculaUnica(prisma, propriedade.produtorId, data.matricula, id);
  }

  return prisma.propriedade.update({ where: { id }, data });
}

export async function removerPropriedade(prisma: PrismaClient, id: string) {
  await obterPropriedade(prisma, id);
  await prisma.propriedade.delete({ where: { id } });
}
