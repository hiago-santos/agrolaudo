import { api } from '@/lib/api';
import type { Safra } from '@/types/domain';

export interface SafraInput {
  rotulo: string;
  inicio: string;
  fim: string;
  ativa?: boolean;
}

export const safrasService = {
  listar: () => api<Safra[]>('/safras'),
  obter: (id: string) => api<Safra>(`/safras/${id}`),
  criar: (data: SafraInput) => api<Safra>('/safras', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<SafraInput>) =>
    api<Safra>(`/safras/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
