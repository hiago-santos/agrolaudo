import { z } from 'zod';

export const classificacaoProdutorSchema = z.enum(['PRONAF', 'PRONAMP', 'DEMAIS']);

export const criarProdutorBodySchema = z.object({
  nome: z.string().min(2, 'Informe o nome completo.'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido.'),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  endereco: z.string().optional(),
  municipio: z.string().min(1),
  uf: z.string().length(2, 'UF deve ter 2 letras.'),
  classificacao: classificacaoProdutorSchema.default('DEMAIS'),
});

export const atualizarProdutorBodySchema = criarProdutorBodySchema.partial();

export const listarProdutoresQuerySchema = z.object({
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const produtorParamsSchema = z.object({ id: z.string().min(1) });
