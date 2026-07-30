import { api } from '@/lib/api';
import type { Paginado, Produtor } from '@/types/domain';

export interface ProdutorInput {
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  municipio: string;
  uf: string;
  classificacao?: Produtor['classificacao'];
}

export const produtoresService = {
  listar: (params: { busca?: string; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.busca) query.set('busca', params.busca);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return api<Paginado<Produtor>>(`/produtores?${query.toString()}`);
  },
  obter: (id: string) => api<Produtor>(`/produtores/${id}`),
  criar: (data: ProdutorInput) => api<Produtor>('/produtores', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<ProdutorInput>) =>
    api<Produtor>(`/produtores/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remover: (id: string) => api<void>(`/produtores/${id}`, { method: 'DELETE' }),
};
