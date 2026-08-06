import { z } from 'zod';

import { publicTokenQuerySchema } from './signatures.schemas.js';

export const requestAdjustmentBodySchema = z.object({
  message: z.string().min(1, 'Descreva o que precisa ser ajustado.'),
});

export const resubmitReviewBodySchema = z.object({
  note: z.string().optional(),
});

export { publicTokenQuerySchema };
