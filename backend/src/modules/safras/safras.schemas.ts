import { z } from 'zod';

export const criarSafraBodySchema = z.object({
  rotulo: z.string().min(4, 'Use o formato "2025/2026".'),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  ativa: z.boolean().default(true),
});

export const atualizarSafraBodySchema = criarSafraBodySchema.partial();

export const safraParamsSchema = z.object({ id: z.string().min(1) });
