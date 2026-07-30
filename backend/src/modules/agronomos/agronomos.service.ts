import type { PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { hashSenha } from '../../lib/hash.js';

import type { atualizarAgronomoBodySchema, criarAgronomoBodySchema } from './agronomos.schemas.js';
import type { z } from 'zod';

type CriarAgronomoInput = z.infer<typeof criarAgronomoBodySchema>;
type AtualizarAgronomoInput = z.infer<typeof atualizarAgronomoBodySchema>;

const AGRONOMO_INCLUDE = { user: { select: { email: true, ativo: true } } } as const;

export async function listarAgronomos(prisma: PrismaClient) {
  return prisma.agronomo.findMany({ orderBy: { nome: 'asc' }, include: AGRONOMO_INCLUDE });
}

export async function obterAgronomo(prisma: PrismaClient, id: string) {
  const agronomo = await prisma.agronomo.findUnique({ where: { id }, include: AGRONOMO_INCLUDE });
  if (!agronomo) throw new NotFoundError('Agrônomo');
  return agronomo;
}

export async function criarAgronomo(prisma: PrismaClient, data: CriarAgronomoInput) {
  const [emailExiste, cpfExiste] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.agronomo.findUnique({ where: { cpf: data.cpf } }),
  ]);
  if (emailExiste) throw new ConflictError(`Já existe um usuário com o e-mail ${data.email}.`);
  if (cpfExiste) throw new ConflictError(`Já existe um agrônomo cadastrado com o CPF ${data.cpf}.`);

  const senhaHash = await hashSenha(data.senha);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { nome: data.nome, email: data.email, senhaHash, role: 'AGRONOMO' },
    });
    return tx.agronomo.create({
      data: {
        userId: user.id,
        nome: data.nome,
        cpf: data.cpf,
        crea: data.crea,
        regiao: data.regiao,
        cidadeEmissao: data.cidadeEmissao,
      },
      include: AGRONOMO_INCLUDE,
    });
  });
}

export async function atualizarAgronomo(prisma: PrismaClient, id: string, data: AtualizarAgronomoInput) {
  await obterAgronomo(prisma, id);
  return prisma.agronomo.update({ where: { id }, data, include: AGRONOMO_INCLUDE });
}
