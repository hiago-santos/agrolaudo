import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as dashboardService from '../services/dashboard.service.js';

const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/summary', { schema: { tags: ['dashboard'] } }, async () =>
    dashboardService.getDashboardSummary(app.prisma),
  );
};

export default dashboardRoutes;
