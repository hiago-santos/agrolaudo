import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as dashboardService from './dashboard.service.js';

const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/resumo', { schema: { tags: ['dashboard'] } }, async () =>
    dashboardService.resumoDashboard(app.prisma),
  );
};

export default dashboardRoutes;
