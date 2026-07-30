import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
});
export type LoginBody = z.infer<typeof loginBodySchema>;
