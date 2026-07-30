import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  agronomoParamsSchema,
  atualizarAgronomoBodySchema,
  criarAgronomoBodySchema,
} from './agronomos.schemas.js';
import * as agronomosService from './agronomos.service.js';

const agronomosRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['agronomos'] } }, async () =>
    agronomosService.listarAgronomos(app.prisma),
  );

  app.get(
    '/:id',
    { schema: { params: agronomoParamsSchema, tags: ['agronomos'] } },
    async (request) => agronomosService.obterAgronomo(app.prisma, request.params.id),
  );

  // Cadastro de um novo Engenheiro Agrônomo cria também o login dele — só ADMIN gerencia isso.
  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN')],
      schema: { body: criarAgronomoBodySchema, tags: ['agronomos'] },
    },
    async (request, reply) => {
      const agronomo = await agronomosService.criarAgronomo(app.prisma, request.body);
      reply.status(201);
      return agronomo;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: agronomoParamsSchema, body: atualizarAgronomoBodySchema, tags: ['agronomos'] },
    },
    async (request) => agronomosService.atualizarAgronomo(app.prisma, request.params.id, request.body),
  );
};

export default agronomosRoutes;
