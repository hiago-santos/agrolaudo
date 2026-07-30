import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { atualizarSafraBodySchema, criarSafraBodySchema, safraParamsSchema } from './safras.schemas.js';
import * as safrasService from './safras.service.js';

const safrasRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['safras'] } }, async () => safrasService.listarSafras(app.prisma));

  app.get(
    '/:id',
    { schema: { params: safraParamsSchema, tags: ['safras'] } },
    async (request) => safrasService.obterSafra(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { body: criarSafraBodySchema, tags: ['safras'] },
    },
    async (request, reply) => {
      const safra = await safrasService.criarSafra(app.prisma, request.body);
      reply.status(201);
      return safra;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: safraParamsSchema, body: atualizarSafraBodySchema, tags: ['safras'] },
    },
    async (request) => safrasService.atualizarSafra(app.prisma, request.params.id, request.body),
  );
};

export default safrasRoutes;
