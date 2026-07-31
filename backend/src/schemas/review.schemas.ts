import { z } from 'zod';

export const bankReviewBodySchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  creditLimit: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});
