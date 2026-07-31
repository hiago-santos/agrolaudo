import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { projectParamsSchema } from '../schemas/projects.schemas.js';
import { bankReviewBodySchema } from '../schemas/review.schemas.js';
import * as reviewService from '../services/review.service.js';

/** Decisão de crédito do banco — única escrita que o papel BANK realiza. */
const reviewRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/:id/review',
    {
      preHandler: [app.requireRole('ADMIN', 'BANK')],
      schema: {
        params: projectParamsSchema,
        body: bankReviewBodySchema,
        tags: ['review'],
        summary: 'Registra a decisão de crédito do banco (aprova/reprova)',
      },
    },
    async (request) =>
      reviewService.reviewProject(app.prisma, request.params.id, request.user.sub, request.body),
  );
};

export default reviewRoutes;
