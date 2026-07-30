import { api } from '@/lib/api';
import type { User } from '@/types/domain';

export const authService = {
  login: (email: string, senha: string) =>
    api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  logout: () => api<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => api<User>('/auth/me'),
};
