import { api } from '@/lib/api';
import type { Atividade } from '@/types/domain';

export const atividadesService = {
  listar: (params: { ativo?: boolean; pecuaria?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.ativo !== undefined) query.set('ativo', String(params.ativo));
    if (params.pecuaria !== undefined) query.set('pecuaria', String(params.pecuaria));
    return api<Atividade[]>(`/atividades?${query.toString()}`);
  },
  obter: (id: string) => api<Atividade>(`/atividades/${id}`),
};
