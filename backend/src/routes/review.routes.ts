import type { FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Env } from '../env.js';
import { projectParamsSchema } from '../schemas/projects.schemas.js';
import {
  requestAdjustmentBodySchema,
  resubmitReviewBodySchema,
} from '../schemas/producerInfo.schemas.js';
import { bankReviewBodySchema } from '../schemas/review.schemas.js';
import * as producerInfoService from '../services/producerInfo.service.js';
import * as reviewService from '../services/review.service.js';

interface ReviewRoutesOptions extends FastifyPluginOptions {
  env: Env;
}

/** Decisão de crédito, ajustes e link público do projeto. */
const reviewRoutes: FastifyPluginAsyncZod<ReviewRoutesOptions> = async (app, opts) => {
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
    async (request) => {
      const project = await reviewService.reviewProject(
        app.prisma,
        request.params.id,
        request.user.sub,
        request.body,
      );
      const { link } = await producerInfoService.ensurePublicViewLink(
        app.prisma,
        request.params.id,
        opts.env.PUBLIC_APP_URL,
      );
      return { project, publicLink: link };
    },
  );

  app.post(
    '/:id/request-adjustment',
    {
      preHandler: [app.requireRole('ADMIN', 'BANK')],
      schema: {
        params: projectParamsSchema,
        body: requestAdjustmentBodySchema,
        tags: ['review'],
        summary: 'Devolve o projeto para ajustes do agrônomo/banco',
      },
    },
    async (request) =>
      producerInfoService.requestAdjustment(
        app.prisma,
        request.params.id,
        request.user.sub,
        request.user.name,
        request.body.message,
      ),
  );

  app.post(
    '/:id/resubmit-review',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST', 'BANK')],
      schema: {
        params: projectParamsSchema,
        body: resubmitReviewBodySchema,
        tags: ['review'],
        summary: 'Reenvia o projeto para análise após ajustes',
      },
    },
    async (request) =>
      producerInfoService.resubmitAfterAdjustment(
        app.prisma,
        request.params.id,
        request.user.sub,
        request.user.name,
        request.body.note,
      ),
  );

  app.post(
    '/:id/public-link',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST', 'BANK')],
      schema: {
        params: projectParamsSchema,
        tags: ['review'],
        summary: 'Gera ou recupera o link público de visualização do projeto',
      },
    },
    async (request) =>
      producerInfoService.ensurePublicViewLink(
        app.prisma,
        request.params.id,
        opts.env.PUBLIC_APP_URL,
      ),
  );
};

export default reviewRoutes;
