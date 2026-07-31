import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { NotFoundError } from '../lib/errors.js';
import { loginBodySchema } from '../schemas/auth.schemas.js';
import { authenticate, getLoggedInUser } from '../services/auth.service.js';

const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12h — turno de trabalho de campo

/** Sempre Bearer no header `Authorization` — sem cookie, sem sessão de servidor. */
const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    { schema: { body: loginBodySchema, tags: ['auth'], summary: 'Login por e-mail e senha' } },
    async (request) => {
      const { email, password } = request.body;
      const user = await authenticate(app.prisma, email, password);

      const token = app.jwt.sign(
        { sub: user.id, role: user.role, name: user.name },
        { expiresIn: SESSION_DURATION_SECONDS },
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          agronomist: user.agronomist,
        },
      };
    },
  );

  app.post('/logout', { schema: { tags: ['auth'] } }, async () => {
    // Stateless: não há sessão de servidor para invalidar — o cliente só descarta o token.
    return { ok: true };
  });

  app.get('/me', { preHandler: [app.authenticate], schema: { tags: ['auth'] } }, async (request) => {
    const user = await getLoggedInUser(app.prisma, request.user.sub);
    if (!user) throw new NotFoundError('Usuário');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agronomist: user.agronomist,
    };
  });
};

export default authRoutes;
