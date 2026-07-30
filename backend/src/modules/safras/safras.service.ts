import type { PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../lib/errors.js';

import type { atualizarSafraBodySchema, criarSafraBodySchema } from './safras.schemas.js';
import type { z } from 'zod';

type CriarSafraInput = z.infer<typeof criarSafraBodySchema>;
type AtualizarSafraInput = z.infer<typeof atualizarSafraBodySchema>;

export async function listarSafras(prisma: PrismaClient) {
  return prisma.safra.findMany({ orderBy: { inicio: 'desc' } });
}

export async function obterSafra(prisma: PrismaClient, id: string) {
  const safra = await prisma.safra.findUnique({ where: { id } });
  if (!safra) throw new NotFoundError('Safra');
  return safra;
}

export async function criarSafra(prisma: PrismaClient, data: CriarSafraInput) {
  const existente = await prisma.safra.findUnique({ where: { rotulo: data.rotulo } });
  if (existente) throw new ConflictError(`Já existe uma safra "${data.rotulo}".`);
  return prisma.safra.create({ data });
}

export async function atualizarSafra(prisma: PrismaClient, id: string, data: AtualizarSafraInput) {
  await obterSafra(prisma, id);
  return prisma.safra.update({ where: { id }, data });
}
