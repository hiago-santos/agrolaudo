import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  createProducerBodySchema,
  listProducersQuerySchema,
  producerParamsSchema,
  updateProducerBodySchema,
} from '../schemas/producers.schemas.js';
import * as producersService from '../services/producers.service.js';

const producersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listProducersQuerySchema, tags: ['producers'] } },
    async (request) => producersService.listProducers(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: producerParamsSchema, tags: ['producers'] } },
    async (request) => producersService.getProducer(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { body: createProducerBodySchema, tags: ['producers'] },
    },
    async (request, reply) => {
      const producer = await producersService.createProducer(app.prisma, request.body);
      reply.status(201);
      return producer;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { params: producerParamsSchema, body: updateProducerBodySchema, tags: ['producers'] },
    },
    async (request) => producersService.updateProducer(app.prisma, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN')],
      schema: { params: producerParamsSchema, tags: ['producers'] },
    },
    async (request, reply) => {
      await producersService.deleteProducer(app.prisma, request.params.id);
      reply.status(204);
    },
  );
};

export default producersRoutes;
