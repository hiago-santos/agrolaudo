import { z } from 'zod';

export const tipoAssinaturaSchema = z.enum(['AGRONOMO', 'PRODUTOR']);

export const criarAssinaturaBodySchema = z.object({
  tipo: tipoAssinaturaSchema,
  imagemBase64: z.string().min(1, 'Assinatura vazia — desenhe antes de confirmar.'),
});

export const gerarLinkBodySchema = z.object({
  tipo: tipoAssinaturaSchema,
});

export const assinarPublicoBodySchema = z.object({
  token: z.string().min(1),
  imagemBase64: z.string().min(1, 'Assinatura vazia — desenhe antes de confirmar.'),
});

export const publicoQuerySchema = z.object({
  token: z.string().min(1),
});
