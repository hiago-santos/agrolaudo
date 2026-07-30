import { z } from 'zod';

export const criarAgronomoBodySchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().min(11),
  crea: z.string().min(3),
  regiao: z.string().optional(),
  cidadeEmissao: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
});

export const atualizarAgronomoBodySchema = z.object({
  nome: z.string().min(2).optional(),
  crea: z.string().min(3).optional(),
  regiao: z.string().optional(),
  cidadeEmissao: z.string().min(1).optional(),
  assinaturaPadraoBase64: z.string().optional(),
});

export const agronomoParamsSchema = z.object({ id: z.string().min(1) });
