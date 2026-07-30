import { z } from 'zod';

export const itemCotacaoInputSchema = z.object({
  atividadeId: z.string().min(1),
  unidade: z.string().min(1),
  precoUnitario: z.coerce.number().nonnegative(),
  custoPorHa: z.coerce.number().nonnegative(),
  regiao: z.string().optional(),
});

export const atualizarCotacoesBodySchema = z.object({
  itens: z.array(itemCotacaoInputSchema).min(1, 'Envie ao menos uma cotação para salvar.'),
});

export const historicoParamsSchema = z.object({ atividadeId: z.string().min(1) });
