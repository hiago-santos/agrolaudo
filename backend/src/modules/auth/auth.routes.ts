import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { NotFoundError } from '../../lib/errors.js';
import { COOKIE_NAME } from '../../plugins/auth.js';

import { loginBodySchema } from './auth.schemas.js';
import { autenticar, buscarUsuarioLogado } from './auth.service.js';

const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 12; // 12h — turno de trabalho de campo

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    { schema: { body: loginBodySchema, tags: ['auth'], summary: 'Login por e-mail e senha' } },
    async (request, reply) => {
      const { email, senha } = request.body;
      const user = await autenticar(app.prisma, email, senha);

      const token = app.jwt.sign(
        { sub: user.id, role: user.role, nome: user.nome },
        { expiresIn: DURACAO_SESSAO_SEGUNDOS },
      );

      reply.setCookie(COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: DURACAO_SESSAO_SEGUNDOS,
      });

      return {
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          agronomo: user.agronomo,
        },
      };
    },
  );

  app.post('/logout', { schema: { tags: ['auth'] } }, async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get(
    '/me',
    { preHandler: [app.authenticate], schema: { tags: ['auth'] } },
    async (request) => {
      const user = await buscarUsuarioLogado(app.prisma, request.user.sub);
      if (!user) throw new NotFoundError('Usuário');
      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        agronomo: user.agronomo,
      };
    },
  );
};

export default authRoutes;
