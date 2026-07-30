import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { ValidationError } from '../../lib/errors.js';

import { atualizarCotacoesBodySchema, historicoParamsSchema } from './cotacoes.schemas.js';
import * as cotacoesService from './cotacoes.service.js';

const cotacoesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { tags: ['cotacoes'], summary: 'Matriz de preços atual' } }, async () =>
    cotacoesService.obterMatrizAtual(app.prisma),
  );

  app.put(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: {
        body: atualizarCotacoesBodySchema,
        tags: ['cotacoes'],
        summary: 'Salvar novas cotações (append — não sobrescreve o histórico)',
      },
    },
    async (request) =>
      cotacoesService.atualizarCotacoes(app.prisma, request.body.itens, request.user.sub),
  );

  app.get(
    '/:atividadeId/historico',
    { schema: { params: historicoParamsSchema, tags: ['cotacoes'] } },
    async (request) => cotacoesService.historicoDaAtividade(app.prisma, request.params.atividadeId),
  );

  app.get(
    '/export.xlsx',
    { preHandler: [app.requireRole('ADMIN', 'AGRONOMO')], schema: { tags: ['cotacoes'] } },
    async (_request, reply) => {
      const buffer = await cotacoesService.exportarMatrizXlsx(app.prisma);
      reply
        .header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        .header('Content-Disposition', 'attachment; filename="matriz-precos-agrolaudo.xlsx"')
        .send(buffer);
    },
  );

  app.post(
    '/import',
    { preHandler: [app.requireRole('ADMIN', 'AGRONOMO')], schema: { tags: ['cotacoes'] } },
    async (request) => {
      const file = await request.file();
      if (!file) throw new ValidationError('Envie um arquivo .xlsx no campo do formulário.');
      const buffer = await file.toBuffer();
      return cotacoesService.importarMatrizXlsx(app.prisma, buffer, request.user.sub);
    },
  );
};

export default cotacoesRoutes;
