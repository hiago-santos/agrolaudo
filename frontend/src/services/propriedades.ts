import { api } from '@/lib/api';
import type { Paginado, Propriedade } from '@/types/domain';

export interface PropriedadeInput {
  produtorId: string;
  nome: string;
  matricula: string;
  municipio: string;
  uf: string;
  areaTotalHa: number;
  inscricaoEstadual?: string;
  car?: string;
  latitude?: number;
  longitude?: number;
}

export const propriedadesService = {
  listar: (params: { produtorId?: string; busca?: string; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.produtorId) query.set('produtorId', params.produtorId);
    if (params.busca) query.set('busca', params.busca);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return api<Paginado<Propriedade>>(`/propriedades?${query.toString()}`);
  },
  obter: (id: string) => api<Propriedade>(`/propriedades/${id}`),
  criar: (data: PropriedadeInput) =>
    api<Propriedade>('/propriedades', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<Omit<PropriedadeInput, 'produtorId'>>) =>
    api<Propriedade>(`/propriedades/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remover: (id: string) => api<void>(`/propriedades/${id}`, { method: 'DELETE' }),
};
