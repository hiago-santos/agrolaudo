import type { FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Env } from '../../env.js';
import { gerarLaudoXlsx } from '../../report/laudo-xlsx.js';
import { fecharBrowserPdf, renderHtmlParaPdf } from '../../report/laudo-pdf.js';
import { renderLaudoHtml } from '../../report/laudo-template.js';
import { laudoParaDocumento } from '../../report/mapper.js';
import { gerarQrCodeDataUrl } from '../../report/qrcode.util.js';

import { criarAssinaturaBodySchema, gerarLinkBodySchema } from './assinaturas.schemas.js';
import * as assinaturasService from './assinaturas.service.js';
import {
  atualizarLaudoBodySchema,
  calcularLaudoBodySchema,
  criarLaudoBodySchema,
  duplicarLaudoBodySchema,
  laudoParamsSchema,
  listarLaudosQuerySchema,
} from './laudos.schemas.js';
import * as laudosService from './laudos.service.js';

interface LaudosRoutesOptions extends FastifyPluginOptions {
  env: Env;
}

/**
 * Toda escrita (POST/PATCH) é restrita a ADMIN/AGRONOMO. As leituras (GET) só
 * exigem sessão válida — é assim que o perfil BANCO ("somente leitura", ver plano)
 * enxerga os laudos sem precisar de `if` de role espalhado pelos handlers.
 */
const laudosRoutes: FastifyPluginAsyncZod<LaudosRoutesOptions> = async (app, opts) => {
  app.addHook('preHandler', app.authenticate);

  app.addHook('onClose', async () => {
    await fecharBrowserPdf();
  });

  app.post(
    '/calcular',
    { schema: { body: calcularLaudoBodySchema, tags: ['laudos'], summary: 'Preview ao vivo, sem persistir' } },
    async (request) => laudosService.calcularLaudo(app.prisma, request.body.itens),
  );

  app.get(
    '/',
    { schema: { querystring: listarLaudosQuerySchema, tags: ['laudos'] } },
    async (request) => laudosService.listarLaudos(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: laudoParamsSchema, tags: ['laudos'] } },
    async (request) => laudosService.obterLaudo(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { body: criarLaudoBodySchema, tags: ['laudos'] },
    },
    async (request, reply) => {
      const laudo = await laudosService.criarLaudo(app.prisma, request.body);
      reply.status(201);
      return laudo;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: laudoParamsSchema, body: atualizarLaudoBodySchema, tags: ['laudos'] },
    },
    async (request) => laudosService.atualizarLaudo(app.prisma, request.params.id, request.body),
  );

  app.post(
    '/:id/cancelar',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: laudoParamsSchema, tags: ['laudos'] },
    },
    async (request) => laudosService.cancelarLaudo(app.prisma, request.params.id),
  );

  app.post(
    '/:id/duplicar',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { params: laudoParamsSchema, body: duplicarLaudoBodySchema, tags: ['laudos'] },
    },
    async (request, reply) => {
      const laudo = await laudosService.duplicarLaudo(app.prisma, request.params.id, request.body.safraId);
      reply.status(201);
      return laudo;
    },
  );

  // ── Documentos: preview (iframe), XLSX fiel ao modelo e PDF padrão bancário ──
  // Os três consomem o MESMO renderLaudoHtml/laudoParaDocumento — tela, XLSX e PDF
  // nunca mostram números diferentes entre si (ver plano, seção "Arquitetura").

  app.post(
    '/preview',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: { body: criarLaudoBodySchema, tags: ['laudos'], summary: 'Preview do documento antes de salvar' },
    },
    async (request, reply) => {
      const documento = await laudosService.montarPreviewDocumento(app.prisma, request.body);
      const html = renderLaudoHtml(documento);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return reply.send(html);
    },
  );

  app.get(
    '/:id/preview',
    { schema: { params: laudoParamsSchema, tags: ['laudos'] } },
    async (request, reply) => {
      const laudo = await laudosService.obterLaudo(app.prisma, request.params.id);
      const documento = laudoParaDocumento(laudo);
      const qrCodeDataUrl = laudo.hashDocumento
        ? await gerarQrCodeDataUrl(`${opts.env.PUBLIC_APP_URL}/verificar/${laudo.hashDocumento}`)
        : null;
      const html = renderLaudoHtml(documento, { qrCodeDataUrl });
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return reply.send(html);
    },
  );

  app.get(
    '/:id/pdf',
    { schema: { params: laudoParamsSchema, tags: ['laudos'] } },
    async (request, reply) => {
      const laudo = await laudosService.obterLaudo(app.prisma, request.params.id);
      const documento = laudoParaDocumento(laudo);
      const qrCodeDataUrl = laudo.hashDocumento
        ? await gerarQrCodeDataUrl(`${opts.env.PUBLIC_APP_URL}/verificar/${laudo.hashDocumento}`)
        : null;
      const html = renderLaudoHtml(documento, { qrCodeDataUrl });
      const pdf = await renderHtmlParaPdf(html);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${laudo.numero}.pdf"`);
      return reply.send(pdf);
    },
  );

  app.get(
    '/:id/xlsx',
    { schema: { params: laudoParamsSchema, tags: ['laudos'] } },
    async (request, reply) => {
      const laudo = await laudosService.obterLaudo(app.prisma, request.params.id);
      const documento = laudoParaDocumento(laudo);
      const xlsx = await gerarLaudoXlsx(documento);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${laudo.numero}.xlsx"`);
      return reply.send(xlsx);
    },
  );

  // ── Assinaturas: coleta presencial (touch/mouse) ou geração de link remoto ──

  app.post(
    '/:id/assinaturas',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: {
        params: laudoParamsSchema,
        body: criarAssinaturaBodySchema,
        tags: ['assinaturas'],
        summary: 'Coleta assinatura desenhada na tela (agrônomo e produtor lado a lado)',
      },
    },
    async (request) =>
      assinaturasService.coletarAssinatura(app.prisma, request.params.id, request.body.tipo, request.body.imagemBase64, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      }),
  );

  app.post(
    '/:id/assinaturas/link',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMO')],
      schema: {
        params: laudoParamsSchema,
        body: gerarLinkBodySchema,
        tags: ['assinaturas'],
        summary: 'Gera link de assinatura remota (QR Code / WhatsApp / e-mail)',
      },
    },
    async (request) =>
      assinaturasService.gerarLinkAssinatura(app.prisma, request.params.id, request.body.tipo, opts.env.PUBLIC_APP_URL),
  );
};

export default laudosRoutes;
