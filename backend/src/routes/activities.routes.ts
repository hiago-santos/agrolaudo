import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { activityParamsSchema, listActivitiesQuerySchema } from '../schemas/activities.schemas.js';
import * as activitiesService from '../services/activities.service.js';

/**
 * Catálogo somente leitura pela API — as 15 atividades são seedadas a partir de
 * backend/src/core/activities.ts. Alterar preço/custo é feito em /price-quotes, não aqui.
 */
const activitiesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listActivitiesQuerySchema, tags: ['activities'] } },
    async (request) => activitiesService.listActivities(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: activityParamsSchema, tags: ['activities'] } },
    async (request) => activitiesService.getActivity(app.prisma, request.params.id),
  );
};

export default activitiesRoutes;
