import { z } from 'zod';

export const criarPropriedadeBodySchema = z.object({
  produtorId: z.string().min(1),
  nome: z.string().min(1),
  matricula: z.string().min(1),
  municipio: z.string().min(1),
  uf: z.string().length(2),
  areaTotalHa: z.coerce.number().nonnegative(),
  inscricaoEstadual: z.string().optional(),
  car: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const atualizarPropriedadeBodySchema = criarPropriedadeBodySchema.partial().omit({
  produtorId: true,
});

export const listarPropriedadesQuerySchema = z.object({
  produtorId: z.string().optional(),
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const propriedadeParamsSchema = z.object({ id: z.string().min(1) });
