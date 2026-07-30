import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as assinaturasService from '../laudos/assinaturas.service.js';
import { renderLaudoHtml } from '../../report/laudo-template.js';
import { laudoParaDocumento } from '../../report/mapper.js';

import { assinarPublicoBodySchema, hashParamsSchema, laudoParamsSchema, publicoQuerySchema } from './publico.schemas.js';

/**
 * Rotas SEM autenticação — acessadas pelo link de assinatura (produtor/agrônomo
 * remoto) e pelo QR Code de verificação impresso no PDF. Segurança aqui é o token
 * (assinaturas.service valida existência + validade), não a sessão.
 */
const publicoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/laudos/:id',
    {
      schema: {
        params: laudoParamsSchema,
        querystring: publicoQuerySchema,
        tags: ['publico'],
        summary: 'Visualização sem login para conferir e assinar o laudo',
      },
    },
    async (request) => {
      const { laudo, tipo, jaAssinado } = await assinaturasService.obterParaAssinaturaPublica(
        app.prisma,
        request.params.id,
        request.query.token,
      );
      const html = renderLaudoHtml(laudoParaDocumento(laudo));
      return { numero: laudo.numero, status: laudo.status, tipo, jaAssinado, html };
    },
  );

  app.post(
    '/laudos/:id/assinar',
    {
      schema: {
        params: laudoParamsSchema,
        body: assinarPublicoBodySchema,
        tags: ['publico'],
        summary: 'Confirma a assinatura coletada pelo link público',
      },
    },
    async (request) =>
      assinaturasService.assinarPublico(app.prisma, request.params.id, request.body.token, request.body.imagemBase64, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      }),
  );

  app.get(
    '/verificar/:hash',
    {
      schema: {
        params: hashParamsSchema,
        tags: ['publico'],
        summary: 'Destino do QR Code impresso no laudo — confirma autenticidade',
      },
    },
    async (request) => assinaturasService.verificarPorHash(app.prisma, request.params.hash),
  );
};

export default publicoRoutes;
