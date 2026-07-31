import { createHash, randomBytes } from 'node:crypto';

import type { PrismaClient, UserRole } from '@prisma/client';

import { UnauthorizedError } from '../lib/errors.js';
import { verifyPassword } from '../lib/hash.js';

const USER_WITH_AGRONOMIST_INCLUDE = { agronomist: true } as const;

/** Access token — renovado pelo refresh. */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 h
/** Sem "lembrar-me": refresh padrão (some do sessionStorage ao fechar o navegador). */
export const REFRESH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
/** Com "lembrar-me": permanece no localStorage entre sessões. */
export const REFRESH_REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export type AuthUser = Awaited<ReturnType<typeof authenticate>>;

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

function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function issueRawRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    agronomist: user.agronomist,
  };
}

export async function createRefreshToken(
  prisma: PrismaClient,
  userId: string,
  remember: boolean,
): Promise<{ raw: string; expiresAt: Date }> {
  const raw = issueRawRefreshToken();
  const ttl = remember ? REFRESH_REMEMBER_TTL_SECONDS : REFRESH_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt,
      remember,
    },
  });

  return { raw, expiresAt };
}

export async function rotateRefreshToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<{ user: AuthUser; refreshToken: string; remember: boolean }> {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: USER_WITH_AGRONOMIST_INCLUDE } },
  });

  if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }

  if (!existing.user.active) {
    throw new UnauthorizedError('Usuário inativo.');
  }

  // Rotação atômica: só um request concorrente consegue revogar o token.
  const revoked = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (revoked.count === 0) {
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }

  const next = await createRefreshToken(prisma, existing.userId, existing.remember);
  return { user: existing.user, refreshToken: next.raw, remember: existing.remember };
}

export async function revokeRefreshToken(prisma: PrismaClient, rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashRefreshToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
