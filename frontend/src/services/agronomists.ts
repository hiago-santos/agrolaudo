import { api } from '@/lib/api';
import type { Agronomist } from '@/types/domain';

export interface AgronomistInput {
  name: string;
  document: string;
  licenseNumber: string;
  region?: string;
  issuingCity: string;
  email: string;
  password: string;
}

export const agronomistsService = {
  list: () => api<Agronomist[]>('/agronomists'),
  get: (id: string) => api<Agronomist>(`/agronomists/${id}`),
  create: (data: AgronomistInput) =>
    api<Agronomist>('/agronomists', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<AgronomistInput, 'document' | 'email' | 'password'>>) =>
    api<Agronomist>(`/agronomists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
