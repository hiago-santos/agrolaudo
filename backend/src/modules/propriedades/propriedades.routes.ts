import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  atualizarPropriedadeBodySchema,
  criarPropriedadeBodySchema,
  listarPropriedadesQuerySchema,
  propriedadeParamsSchema,
} from './propriedades.schemas.js';
import * as propriedadesService from './propriedades.service.js';

const propriedadesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listarPropriedadesQuerySchema, tags: ['propriedades'] } },
    async (request) => propriedadesService.listarPropriedades(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: propriedadeParamsSchema, tags: ['propriedades'] } },
    async (request) => propriedadesService.obterPropriedade(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { body: criarPropriedadeBodySchema, tags: ['propriedades'] },
    },
    async (request, reply) => {
      const propriedade = await propriedadesService.criarPropriedade(app.prisma, request.body);
      reply.status(201);
      return propriedade;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: propriedadeParamsSchema, body: atualizarPropriedadeBodySchema, tags: ['propriedades'] },
    },
    async (request) =>
      propriedadesService.atualizarPropriedade(app.prisma, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN')],
      schema: { params: propriedadeParamsSchema, tags: ['propriedades'] },
    },
    async (request, reply) => {
      await propriedadesService.removerPropriedade(app.prisma, request.params.id);
      reply.status(204);
    },
  );
};

export default propriedadesRoutes;
