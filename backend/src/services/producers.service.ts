import type { Prisma, PrismaClient } from '@prisma/client';

import { PRODUCER_WITH_PROPERTIES_INCLUDE } from '../lib/prismaIncludes.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';

import type {
  createProducerBodySchema,
  updateProducerBodySchema,
} from '../schemas/producers.schemas.js';
import type { z } from 'zod';

type CreateProducerInput = z.infer<typeof createProducerBodySchema>;
type UpdateProducerInput = z.infer<typeof updateProducerBodySchema>;

export async function listProducers(
  prisma: PrismaClient,
  params: { search?: string; page: number; pageSize: number },
) {
  const where: Prisma.ProducerWhereInput = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { taxId: { contains: params.search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.producer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: PRODUCER_WITH_PROPERTIES_INCLUDE,
    }),
    prisma.producer.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getProducer(prisma: PrismaClient, id: string) {
  const producer = await prisma.producer.findUnique({
    where: { id },
    include: PRODUCER_WITH_PROPERTIES_INCLUDE,
  });
  if (!producer) throw new NotFoundError('Produtor');
  return producer;
}

export async function createProducer(prisma: PrismaClient, data: CreateProducerInput) {
  const existing = await prisma.producer.findUnique({ where: { taxId: data.taxId } });
  if (existing) {
    throw new ConflictError(`Já existe um produtor cadastrado com o CPF/CNPJ ${data.taxId}.`);
  }
  return prisma.producer.create({ data });
}

export async function updateProducer(prisma: PrismaClient, id: string, data: UpdateProducerInput) {
  await getProducer(prisma, id);

  if (data.taxId) {
    const other = await prisma.producer.findUnique({ where: { taxId: data.taxId } });
    if (other && other.id !== id) {
      throw new ConflictError(`Já existe um produtor cadastrado com o CPF/CNPJ ${data.taxId}.`);
    }
  }

  return prisma.producer.update({ where: { id }, data });
}

export async function deleteProducer(prisma: PrismaClient, id: string) {
  await getProducer(prisma, id);
  await prisma.producer.delete({ where: { id } });
}
