import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { RoleUsuario } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { Env } from '../env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export interface JwtPayload {
  sub: string;
  role: RoleUsuario;
  nome: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: RoleUsuario[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const COOKIE_NAME = 'agrolaudo_token';

interface AuthPluginOptions {
  env: Env;
}

/**
 * JWT em cookie httpOnly — casa com o `credentials: 'include'` do wrapper de fetch
 * do frontend (skill frontend-patterns-copy). `authenticate` valida a sessão;
 * `requireRole` checa o papel já autenticado — os dois compõem no array de
 * `preHandler` de cada rota protegida.
 */
export default fp(async function authPlugin(app: FastifyInstance, opts: AuthPluginOptions) {
  await app.register(cookie, { secret: opts.env.COOKIE_SECRET });
  await app.register(jwt, {
    secret: opts.env.JWT_SECRET,
    cookie: { cookieName: COOKIE_NAME, signed: false },
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.');
    }
  });

  app.decorate('requireRole', (...roles: RoleUsuario[]) => {
    return async (request: FastifyRequest) => {
      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError();
      }
    };
  });
});
