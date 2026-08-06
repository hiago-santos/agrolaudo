import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  createSeasonBodySchema,
  seasonParamsSchema,
  updateSeasonBodySchema,
} from '../schemas/seasons.schemas.js';
import * as seasonsService from '../services/seasons.service.js';

const seasonsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['seasons'] } }, async () =>
    seasonsService.listSeasons(app.prisma),
  );

  app.get('/:id', { schema: { params: seasonParamsSchema, tags: ['seasons'] } }, async (request) =>
    seasonsService.getSeason(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { body: createSeasonBodySchema, tags: ['seasons'] },
    },
    async (request, reply) => {
      const season = await seasonsService.createSeason(app.prisma, request.body);
      reply.status(201);
      return season;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { params: seasonParamsSchema, body: updateSeasonBodySchema, tags: ['seasons'] },
    },
    async (request) => seasonsService.updateSeason(app.prisma, request.params.id, request.body),
  );
};

export default seasonsRoutes;
