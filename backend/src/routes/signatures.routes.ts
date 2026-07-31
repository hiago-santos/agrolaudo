import type { FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Env } from '../env.js';
import { createSignatureBodySchema, generateSignatureLinkBodySchema } from '../schemas/signatures.schemas.js';
import { projectParamsSchema } from '../schemas/projects.schemas.js';
import * as signaturesService from '../services/signatures.service.js';

interface SignaturesRoutesOptions extends FastifyPluginOptions {
  env: Env;
}

/** Coleta presencial (touch/mouse) ou geração de link remoto de assinatura. */
const signaturesRoutes: FastifyPluginAsyncZod<SignaturesRoutesOptions> = async (app, opts) => {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/:id/signatures',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        params: projectParamsSchema,
        body: createSignatureBodySchema,
        tags: ['signatures'],
        summary: 'Coleta assinatura desenhada na tela (agrônomo e produtor lado a lado)',
      },
    },
    async (request) =>
      signaturesService.collectSignature(
        app.prisma,
        request.params.id,
        request.body.type,
        request.body.imageBase64,
        { ip: request.ip, userAgent: request.headers['user-agent'] },
      ),
  );

  app.post(
    '/:id/signatures/link',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        params: projectParamsSchema,
        body: generateSignatureLinkBodySchema,
        tags: ['signatures'],
        summary: 'Gera link de assinatura remota (QR Code / WhatsApp / e-mail)',
      },
    },
    async (request) =>
      signaturesService.generateSignatureLink(
        app.prisma,
        request.params.id,
        request.body.type,
        opts.env.PUBLIC_APP_URL,
      ),
  );
};

export default signaturesRoutes;
