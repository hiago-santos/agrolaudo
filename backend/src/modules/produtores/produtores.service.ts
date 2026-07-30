import type { Prisma, PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../lib/errors.js';

import type { atualizarProdutorBodySchema, criarProdutorBodySchema } from './produtores.schemas.js';
import type { z } from 'zod';

type CriarProdutorInput = z.infer<typeof criarProdutorBodySchema>;
type AtualizarProdutorInput = z.infer<typeof atualizarProdutorBodySchema>;

export async function listarProdutores(
  prisma: PrismaClient,
  params: { busca?: string; page: number; pageSize: number },
) {
  const where: Prisma.ProdutorWhereInput = params.busca
    ? {
        OR: [
          { nome: { contains: params.busca, mode: 'insensitive' } },
          { cpfCnpj: { contains: params.busca } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.produtor.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { propriedades: true },
    }),
    prisma.produtor.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function obterProdutor(prisma: PrismaClient, id: string) {
  const produtor = await prisma.produtor.findUnique({
    where: { id },
    include: { propriedades: true },
  });
  if (!produtor) throw new NotFoundError('Produtor');
  return produtor;
}

export async function criarProdutor(prisma: PrismaClient, data: CriarProdutorInput) {
  const existente = await prisma.produtor.findUnique({ where: { cpfCnpj: data.cpfCnpj } });
  if (existente) {
    throw new ConflictError(`Já existe um produtor cadastrado com o CPF/CNPJ ${data.cpfCnpj}.`);
  }
  return prisma.produtor.create({ data });
}

export async function atualizarProdutor(prisma: PrismaClient, id: string, data: AtualizarProdutorInput) {
  await obterProdutor(prisma, id);

  if (data.cpfCnpj) {
    const outro = await prisma.produtor.findUnique({ where: { cpfCnpj: data.cpfCnpj } });
    if (outro && outro.id !== id) {
      throw new ConflictError(`Já existe um produtor cadastrado com o CPF/CNPJ ${data.cpfCnpj}.`);
    }
  }

  return prisma.produtor.update({ where: { id }, data });
}

export async function removerProdutor(prisma: PrismaClient, id: string) {
  await obterProdutor(prisma, id);
  await prisma.produtor.delete({ where: { id } });
}
