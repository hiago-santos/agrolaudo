import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  agronomistParamsSchema,
  createAgronomistBodySchema,
  updateAgronomistBodySchema,
} from '../schemas/agronomists.schemas.js';
import * as agronomistsService from '../services/agronomists.service.js';

const agronomistsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['agronomists'] } }, async () =>
    agronomistsService.listAgronomists(app.prisma),
  );

  app.get(
    '/:id',
    { schema: { params: agronomistParamsSchema, tags: ['agronomists'] } },
    async (request) => agronomistsService.getAgronomist(app.prisma, request.params.id),
  );

  // Cadastro de um novo Engenheiro Agrônomo cria também o login dele — só ADMIN gerencia isso.
  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN')],
      schema: { body: createAgronomistBodySchema, tags: ['agronomists'] },
    },
    async (request, reply) => {
      const agronomist = await agronomistsService.createAgronomist(app.prisma, request.body);
      reply.status(201);
      return agronomist;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        params: agronomistParamsSchema,
        body: updateAgronomistBodySchema,
        tags: ['agronomists'],
      },
    },
    async (request) =>
      agronomistsService.updateAgronomist(app.prisma, request.params.id, request.body),
  );
};

export default agronomistsRoutes;
