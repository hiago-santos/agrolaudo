import { api } from '@/lib/api';
import type { Paginated, Producer } from '@/types/domain';

export interface ProducerInput {
  name: string;
  taxId: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  classification?: Producer['classification'];
}

export const producersService = {
  list: (params: { search?: string; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return api<Paginated<Producer>>(`/producers?${query.toString()}`);
  },
  get: (id: string) => api<Producer>(`/producers/${id}`),
  create: (data: ProducerInput) => api<Producer>('/producers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ProducerInput>) =>
    api<Producer>(`/producers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/producers/${id}`, { method: 'DELETE' }),
};
