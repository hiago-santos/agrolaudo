import { z } from 'zod';

export const signatureTypeSchema = z.enum(['AGRONOMIST', 'PRODUCER']);

export const createSignatureBodySchema = z.object({
  type: signatureTypeSchema,
  imageBase64: z.string().min(1, 'Assinatura vazia — desenhe antes de confirmar.'),
});

export const generateSignatureLinkBodySchema = z.object({
  type: signatureTypeSchema,
});

export const publicSignBodySchema = z.object({
  token: z.string().min(1),
  imageBase64: z.string().min(1, 'Assinatura vazia — desenhe antes de confirmar.'),
});

export const publicTokenQuerySchema = z.object({
  token: z.string().min(1),
});
