import { z } from 'zod';

import { projectParamsSchema } from './projects.schemas.js';

export const projectAttachmentSideSchema = z.enum(['PRODUCER', 'BANK']);

export const listProjectAttachmentsQuerySchema = z.object({
  side: projectAttachmentSideSchema.optional(),
});

export const uploadProjectAttachmentQuerySchema = z.object({
  side: projectAttachmentSideSchema,
});

export const projectAttachmentParamsSchema = projectParamsSchema.extend({
  attachmentId: z.string().min(1),
});
