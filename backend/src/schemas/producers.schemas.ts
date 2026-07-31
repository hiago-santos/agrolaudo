import { z } from 'zod';

export const producerClassificationSchema = z.enum(['PRONAF', 'PRONAMP', 'OTHER']);

export const createProducerBodySchema = z.object({
  name: z.string().min(2, 'Informe o nome completo.'),
  taxId: z.string().min(11, 'CPF/CNPJ inválido.'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2, 'UF deve ter 2 letras.'),
  classification: producerClassificationSchema.default('OTHER'),
});

export const updateProducerBodySchema = createProducerBodySchema.partial();

export const listProducersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const producerParamsSchema = z.object({ id: z.string().min(1) });
