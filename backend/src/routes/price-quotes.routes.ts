import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { ValidationError } from '../lib/errors.js';
import { priceQuoteHistoryParamsSchema, updatePriceQuotesBodySchema } from '../schemas/price-quotes.schemas.js';
import * as priceQuotesService from '../services/price-quotes.service.js';

const priceQuotesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['price-quotes'], summary: 'Matriz de preços atual' } }, async () =>
    priceQuotesService.getCurrentPriceMatrix(app.prisma),
  );

  app.put(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        body: updatePriceQuotesBodySchema,
        tags: ['price-quotes'],
        summary: 'Salvar novas cotações (append — não sobrescreve o histórico)',
      },
    },
    async (request) =>
      priceQuotesService.updatePriceQuotes(app.prisma, request.body.items, request.user.sub),
  );

  app.get(
    '/:activityId/history',
    { schema: { params: priceQuoteHistoryParamsSchema, tags: ['price-quotes'] } },
    async (request) => priceQuotesService.getActivityPriceHistory(app.prisma, request.params.activityId),
  );

  app.get(
    '/export.xlsx',
    { preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')], schema: { tags: ['price-quotes'] } },
    async (_request, reply) => {
      const buffer = await priceQuotesService.exportPriceMatrixXlsx(app.prisma);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="agrolaudo-price-matrix.xlsx"')
        .send(buffer);
    },
  );

  app.post(
    '/import',
    { preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')], schema: { tags: ['price-quotes'] } },
    async (request) => {
      const file = await request.file();
      if (!file) throw new ValidationError('Envie um arquivo .xlsx no campo do formulário.');
      const buffer = await file.toBuffer();
      return priceQuotesService.importPriceMatrixXlsx(app.prisma, buffer, request.user.sub);
    },
  );
};

export default priceQuotesRoutes;
