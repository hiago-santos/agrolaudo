import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { NotFoundError } from '../lib/errors.js';
import { loginBodySchema, logoutBodySchema, refreshBodySchema } from '../schemas/auth.schemas.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  authenticate,
  createRefreshToken,
  getLoggedInUser,
  publicUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../services/auth.service.js';

/**
 * Access token curto (Bearer) + refresh token opaco rotacionável.
 * Sem cookie — o frontend guarda o refresh em localStorage/sessionStorage
 * conforme "lembrar-me".
 */
const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    { schema: { body: loginBodySchema, tags: ['auth'], summary: 'Login por e-mail e senha' } },
    async (request) => {
      const { email, password, rememberMe } = request.body;
      const user = await authenticate(app.prisma, email, password);

      const accessToken = app.jwt.sign(
        { sub: user.id, role: user.role, name: user.name },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      );
      const refresh = await createRefreshToken(app.prisma, user.id, rememberMe);

      return {
        accessToken,
        /** Alias legado — mantém testes/clientes antigos funcionando. */
        token: accessToken,
        refreshToken: refresh.raw,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        rememberMe,
        user: publicUser(user),
      };
    },
  );

  app.post(
    '/refresh',
    { schema: { body: refreshBodySchema, tags: ['auth'], summary: 'Renova o access token' } },
    async (request) => {
      const rotated = await rotateRefreshToken(app.prisma, request.body.refreshToken);

      const accessToken = app.jwt.sign(
        { sub: rotated.user.id, role: rotated.user.role, name: rotated.user.name },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      );

      return {
        accessToken,
        token: accessToken,
        refreshToken: rotated.refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        rememberMe: rotated.remember,
        user: publicUser(rotated.user),
      };
    },
  );

  app.post(
    '/logout',
    { schema: { body: logoutBodySchema, tags: ['auth'] } },
    async (request) => {
      await revokeRefreshToken(app.prisma, request.body?.refreshToken);
      return { ok: true };
    },
  );

  app.get('/me', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (request) => {
    const user = await getLoggedInUser(app.prisma, request.user.sub);
    if (!user) throw new NotFoundError('Usuário');
    return publicUser(user);
  });
};

export default authRoutes;
