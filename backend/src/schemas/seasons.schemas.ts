import { z } from 'zod';

export const createSeasonBodySchema = z.object({
  label: z.string().min(4, 'Use o formato "2025/2026".'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  active: z.boolean().default(true),
});

export const updateSeasonBodySchema = createSeasonBodySchema.partial();

export const seasonParamsSchema = z.object({ id: z.string().min(1) });
