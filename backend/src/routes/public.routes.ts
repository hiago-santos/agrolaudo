import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  publicHashParamsSchema,
  publicProjectParamsSchema,
  publicSignBodySchema,
  publicTokenQuerySchema,
} from '../schemas/public.schemas.js';
import { publicTokenQuerySchema as publicViewTokenQuerySchema } from '../schemas/producerInfo.schemas.js';
import * as producerInfoService from '../services/producerInfo.service.js';
import * as signaturesService from '../services/signatures.service.js';

/**
 * Rotas SEM autenticação — acessadas pelo link de assinatura (produtor/agrônomo
 * remoto), visualização pública do projeto e pelo QR Code de verificação. Segurança
 * aqui é o token, não a sessão.
 */
const publicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/projects/:id',
    {
      schema: {
        params: publicProjectParamsSchema,
        querystring: publicTokenQuerySchema,
        tags: ['public'],
        summary: 'Visualização sem login para conferir e assinar o projeto',
      },
    },
    async (request) =>
      signaturesService.getForPublicSigning(app.prisma, request.params.id, request.query.token),
  );

  app.post(
    '/projects/:id/sign',
    {
      schema: {
        params: publicProjectParamsSchema,
        body: publicSignBodySchema,
        tags: ['public'],
        summary: 'Confirma a assinatura coletada pelo link público',
      },
    },
    async (request) =>
      signaturesService.signPublic(
        app.prisma,
        request.params.id,
        request.body.token,
        request.body.imageBase64,
        {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
      ),
  );

  app.get(
    '/verify/:hash',
    {
      schema: {
        params: publicHashParamsSchema,
        tags: ['public'],
        summary: 'Destino do QR Code impresso no documento — confirma autenticidade',
      },
    },
    async (request) => signaturesService.verifyByHash(app.prisma, request.params.hash),
  );

  app.get(
    '/projects/:id/view',
    {
      schema: {
        params: publicProjectParamsSchema,
        querystring: publicViewTokenQuerySchema,
        tags: ['public'],
        summary: 'Visualização pública do projeto para o produtor (resultado)',
      },
    },
    async (request) =>
      producerInfoService.getPublicProjectView(
        app.prisma,
        request.params.id,
        request.query.token,
      ),
  );
};

export default publicRoutes;
