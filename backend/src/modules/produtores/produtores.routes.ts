import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  atualizarProdutorBodySchema,
  criarProdutorBodySchema,
  listarProdutoresQuerySchema,
  produtorParamsSchema,
} from './produtores.schemas.js';
import * as produtoresService from './produtores.service.js';

const produtoresRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listarProdutoresQuerySchema, tags: ['produtores'] } },
    async (request) => produtoresService.listarProdutores(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: produtorParamsSchema, tags: ['produtores'] } },
    async (request) => produtoresService.obterProdutor(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { body: criarProdutorBodySchema, tags: ['produtores'] },
    },
    async (request, reply) => {
      const produtor = await produtoresService.criarProdutor(app.prisma, request.body);
      reply.status(201);
      return produtor;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: produtorParamsSchema, body: atualizarProdutorBodySchema, tags: ['produtores'] },
    },
    async (request) => produtoresService.atualizarProdutor(app.prisma, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    { preHandler: [app.requireRole('ADMIN')], schema: { params: produtorParamsSchema, tags: ['produtores'] } },
    async (request, reply) => {
      await produtoresService.removerProdutor(app.prisma, request.params.id);
      reply.status(204);
    },
  );
};

export default produtoresRoutes;
