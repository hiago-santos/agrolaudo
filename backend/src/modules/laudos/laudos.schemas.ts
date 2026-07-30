import { z } from 'zod';

export const itemLaudoInputSchema = z.object({
  atividadeId: z.string().min(1),
  unidade: z.string().optional(),
  areaHa: z.coerce.number().nonnegative(),
  produtividade: z.coerce.number().nonnegative(),
  precoUnitario: z.coerce.number().nonnegative(),
  custoPorHa: z.coerce.number().nonnegative(),
  rebanhoCabecas: z.coerce.number().nonnegative().optional(),
});

export const calcularLaudoBodySchema = z.object({
  itens: z.array(itemLaudoInputSchema).min(1, 'Adicione ao menos uma atividade.'),
});

export const criarLaudoBodySchema = z.object({
  produtorId: z.string().min(1),
  propriedadeId: z.string().min(1),
  safraId: z.string().min(1),
  agronomoId: z.string().min(1),
  cidadeEmissao: z.string().min(1).optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemLaudoInputSchema).min(1, 'Adicione ao menos uma atividade.'),
});

export const atualizarLaudoBodySchema = z.object({
  cidadeEmissao: z.string().min(1).optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemLaudoInputSchema).min(1).optional(),
});

export const statusLaudoSchema = z.enum([
  'RASCUNHO',
  'AGUARDANDO_ASSINATURA',
  'ASSINADO',
  'CANCELADO',
]);

export const listarLaudosQuerySchema = z.object({
  busca: z.string().optional(),
  produtorId: z.string().optional(),
  safraId: z.string().optional(),
  agronomoId: z.string().optional(),
  status: statusLaudoSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const laudoParamsSchema = z.object({ id: z.string().min(1) });

export const duplicarLaudoBodySchema = z.object({ safraId: z.string().min(1) });
