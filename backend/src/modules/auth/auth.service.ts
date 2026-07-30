import type { PrismaClient } from '@prisma/client';

import { UnauthorizedError } from '../../lib/errors.js';
import { verificarSenha } from '../../lib/hash.js';

const USER_COM_AGRONOMO_INCLUDE = { agronomo: true } as const;

export async function autenticar(prisma: PrismaClient, email: string, senha: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: USER_COM_AGRONOMO_INCLUDE,
  });

  if (!user || !user.ativo) {
    throw new UnauthorizedError('E-mail ou senha incorretos.');
  }

  const senhaValida = await verificarSenha(senha, user.senhaHash);
  if (!senhaValida) {
    throw new UnauthorizedError('E-mail ou senha incorretos.');
  }

  return user;
}

export async function buscarUsuarioLogado(prisma: PrismaClient, userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: USER_COM_AGRONOMO_INCLUDE });
}
