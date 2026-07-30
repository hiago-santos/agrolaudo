import { z } from 'zod';

export const listarAtividadesQuerySchema = z.object({
  ativo: z.coerce.boolean().optional(),
  pecuaria: z.coerce.boolean().optional(),
});

export const atividadeParamsSchema = z.object({ id: z.string().min(1) });
