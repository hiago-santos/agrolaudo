import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { UserRole } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { Env } from '../env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  name: string;
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
      ...roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface AuthPluginOptions {
  env: Env;
}

/**
 * JWT stateless, sempre no header `Authorization: Bearer <token>` — sem cookie,
 * sem sessão de servidor. `authenticate`/`requireRole` são os middlewares
 * (Fastify `preHandler` hooks) que cada rota protegida usa.
 */
export default fp(async function authPlugin(app: FastifyInstance, opts: AuthPluginOptions) {
  await app.register(jwt, { secret: opts.env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      request.log.warn(
        {
          hasAuthorization: Boolean(request.headers.authorization),
          err: error instanceof Error ? error.message : String(error),
        },
        'Falha ao validar JWT',
      );
      throw new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.');
    }
  });

  app.decorate('requireRole', (...roles: UserRole[]) => {
    return async (request: FastifyRequest) => {
      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError();
      }
    };
  });
});
