import type { FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Env } from '../env.js';
import { generateQrCodeDataUrl } from '../documents/qrcode.util.js';
import { generateProjectXlsx } from '../documents/xlsx.generator.js';
import { generateProjectPdf } from '../documents/pdf.generator.js';
import { projectToDocument } from '../documents/mapper.js';
import {
  calculateProjectBodySchema,
  createProjectBodySchema,
  duplicateProjectBodySchema,
  initiateProjectBodySchema,
  listProjectsQuerySchema,
  projectParamsSchema,
  updateProjectBodySchema,
} from '../schemas/projects.schemas.js';
import * as projectsService from '../services/projects.service.js';

interface ProjectsRoutesOptions extends FastifyPluginOptions {
  env: Env;
}

/**
 * Escrita é restrita a ADMIN/AGRONOMIST, com uma exceção: POST /initiate (BANK abre a
 * "casca" do projeto — produtor/propriedade/área financiada, sem atividades). As
 * leituras (GET) só exigem sessão válida — é assim que o perfil BANK enxerga os
 * projetos sem `if` de role espalhado pelos handlers.
 */
const projectsRoutes: FastifyPluginAsyncZod<ProjectsRoutesOptions> = async (app, opts) => {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/calculate',
    {
      schema: {
        body: calculateProjectBodySchema,
        tags: ['projects'],
        summary: 'Preview ao vivo, sem persistir',
      },
    },
    async (request) => projectsService.calculateProject(app.prisma, request.body.items),
  );

  app.get(
    '/',
    { schema: { querystring: listProjectsQuerySchema, tags: ['projects'] } },
    async (request) => projectsService.listProjects(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: projectParamsSchema, tags: ['projects'] } },
    async (request) => projectsService.getProject(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { body: createProjectBodySchema, tags: ['projects'] },
    },
    async (request, reply) => {
      const project = await projectsService.createProject(app.prisma, request.body);
      reply.status(201);
      return project;
    },
  );

  app.post(
    '/initiate',
    {
      preHandler: [app.requireRole('ADMIN', 'BANK')],
      schema: {
        body: initiateProjectBodySchema,
        tags: ['projects'],
        summary:
          'Banco abre a "casca" do projeto (produtor, propriedade, área financiada) — sem atividades',
      },
    },
    async (request, reply) => {
      const project = await projectsService.initiateProject(
        app.prisma,
        request.user.sub,
        request.body,
      );
      reply.status(201);
      return project;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { params: projectParamsSchema, body: updateProjectBodySchema, tags: ['projects'] },
    },
    async (request) => projectsService.updateProject(app.prisma, request.params.id, request.body),
  );

  app.post(
    '/:id/cancel',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { params: projectParamsSchema, tags: ['projects'] },
    },
    async (request) => projectsService.cancelProject(app.prisma, request.params.id),
  );

  app.post(
    '/:id/submit-for-review',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        params: projectParamsSchema,
        tags: ['projects'],
        summary: 'Envia o projeto assinado pro banco decidir o crédito',
      },
    },
    async (request) => projectsService.submitProjectForReview(app.prisma, request.params.id),
  );

  app.post(
    '/:id/duplicate',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { params: projectParamsSchema, body: duplicateProjectBodySchema, tags: ['projects'] },
    },
    async (request, reply) => {
      const project = await projectsService.duplicateProject(
        app.prisma,
        request.params.id,
        request.body.seasonId,
      );
      reply.status(201);
      return project;
    },
  );

  // ── Documentos: XLSX fiel ao modelo do cliente e PDF nativo (sem navegador) ──

  app.get(
    '/:id/xlsx',
    { schema: { params: projectParamsSchema, tags: ['projects'] } },
    async (request, reply) => {
      const project = await projectsService.getProject(app.prisma, request.params.id);
      const document = projectToDocument(project);
      const xlsx = await generateProjectXlsx(document);
      reply.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      reply.header('Content-Disposition', `attachment; filename="${project.number}.xlsx"`);
      return reply.send(xlsx);
    },
  );

  app.get(
    '/:id/pdf',
    { schema: { params: projectParamsSchema, tags: ['projects'] } },
    async (request, reply) => {
      const project = await projectsService.getProject(app.prisma, request.params.id);
      const document = projectToDocument(project);
      const qrCodeDataUrl = project.documentHash
        ? await generateQrCodeDataUrl(`${opts.env.PUBLIC_APP_URL}/verify/${project.documentHash}`)
        : null;
      const pdf = await generateProjectPdf(document, qrCodeDataUrl);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${project.number}.pdf"`);
      return reply.send(pdf);
    },
  );
};

export default projectsRoutes;
