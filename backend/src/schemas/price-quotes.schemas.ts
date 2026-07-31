import { z } from 'zod';

export const priceQuoteItemInputSchema = z.object({
  activityId: z.string().min(1),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  costPerHectare: z.coerce.number().nonnegative(),
  region: z.string().optional(),
});

export const updatePriceQuotesBodySchema = z.object({
  items: z.array(priceQuoteItemInputSchema).min(1, 'Envie ao menos uma cotação para salvar.'),
});

export const priceQuoteHistoryParamsSchema = z.object({ activityId: z.string().min(1) });
