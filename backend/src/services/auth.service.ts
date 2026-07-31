import type { PrismaClient } from '@prisma/client';

import { UnauthorizedError } from '../lib/errors.js';
import { verifyPassword } from '../lib/hash.js';

const USER_WITH_AGRONOMIST_INCLUDE = { agronomist: true } as const;

export async function authenticate(prisma: PrismaClient, email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: USER_WITH_AGRONOMIST_INCLUDE,
  });

  if (!user || !user.active) {
    throw new UnauthorizedError('E-mail ou senha incorretos.');
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError('E-mail ou senha incorretos.');
  }

  return user;
}

export async function getLoggedInUser(prisma: PrismaClient, userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: USER_WITH_AGRONOMIST_INCLUDE });
}
