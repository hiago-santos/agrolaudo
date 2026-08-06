import type { FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Env } from '../env.js';
import { ValidationError } from '../lib/errors.js';
import {
  listProjectAttachmentsQuerySchema,
  projectAttachmentParamsSchema,
  uploadProjectAttachmentQuerySchema,
} from '../schemas/projectAttachments.schemas.js';
import { projectParamsSchema } from '../schemas/projects.schemas.js';
import * as projectAttachmentsService from '../services/projectAttachments.service.js';

interface ProjectAttachmentsRoutesOptions extends FastifyPluginOptions {
  env: Env;
}

const projectAttachmentsRoutes: FastifyPluginAsyncZod<ProjectAttachmentsRoutesOptions> = async (
  app,
  opts,
) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/:id/attachments',
    {
      schema: {
        params: projectParamsSchema,
        querystring: listProjectAttachmentsQuerySchema,
        tags: ['project-attachments'],
        summary: 'Lista anexos do projeto (produtor e/ou banco)',
      },
    },
    async (request) =>
      projectAttachmentsService.listProjectAttachments(
        app.prisma,
        request.params.id,
        request.query.side,
      ),
  );

  app.post(
    '/:id/attachments',
    {
      schema: {
        params: projectParamsSchema,
        querystring: uploadProjectAttachmentQuerySchema,
        tags: ['project-attachments'],
        summary: 'Anexa arquivo ao projeto (lado produtor ou banco)',
      },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        throw new ValidationError('Envie um arquivo no campo "file" do formulário.');
      }
      const buffer = await file.toBuffer();
      const attachment = await projectAttachmentsService.uploadProjectAttachment(
        app.prisma,
        opts.env,
        request.params.id,
        request.query.side,
        request.user.sub,
        request.user.role,
        file.filename,
        file.mimetype,
        buffer,
      );
      reply.status(201);
      return attachment;
    },
  );

  app.get(
    '/:id/attachments/:attachmentId/download',
    {
      schema: {
        params: projectAttachmentParamsSchema,
        tags: ['project-attachments'],
        summary: 'Baixa um anexo do projeto',
      },
    },
    async (request, reply) => {
      const { attachment, stream } = await projectAttachmentsService.downloadProjectAttachment(
        app.prisma,
        opts.env,
        request.params.id,
        request.params.attachmentId,
      );
      reply
        .header('Content-Type', attachment.contentType)
        .header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
      return reply.send(stream);
    },
  );

  app.delete(
    '/:id/attachments/:attachmentId',
    {
      schema: {
        params: projectAttachmentParamsSchema,
        tags: ['project-attachments'],
        summary: 'Remove um anexo do projeto',
      },
    },
    async (request) =>
      projectAttachmentsService.deleteProjectAttachment(
        app.prisma,
        opts.env,
        request.params.id,
        request.params.attachmentId,
        request.user.sub,
        request.user.role,
      ),
  );
};

export default projectAttachmentsRoutes;
