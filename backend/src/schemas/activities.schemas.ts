import { z } from 'zod';

export const listActivitiesQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  isLivestock: z.coerce.boolean().optional(),
});

export const activityParamsSchema = z.object({ id: z.string().min(1) });
