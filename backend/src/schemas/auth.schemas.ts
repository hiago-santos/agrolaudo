import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'Informe o refresh token.'),
});
export type RefreshBody = z.infer<typeof refreshBodySchema>;

export const logoutBodySchema = z.object({
  refreshToken: z.string().optional(),
});
export type LogoutBody = z.infer<typeof logoutBodySchema>;
