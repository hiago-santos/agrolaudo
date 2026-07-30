import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { atividadeParamsSchema, listarAtividadesQuerySchema } from './atividades.schemas.js';
import * as atividadesService from './atividades.service.js';

/**
 * Catálogo somente leitura pela API — as 15 atividades são seedadas a partir de
 * backend/src/core/atividades.ts. Alterar preço/custo é feito em /cotacoes, não aqui.
 */
const atividadesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listarAtividadesQuerySchema, tags: ['atividades'] } },
    async (request) => atividadesService.listarAtividades(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: atividadeParamsSchema, tags: ['atividades'] } },
    async (request) => atividadesService.obterAtividade(app.prisma, request.params.id),
  );
};

export default atividadesRoutes;
