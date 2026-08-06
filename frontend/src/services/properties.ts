import { api } from '@/lib/api';
import type { GeoPolygon, Paginated, Property } from '@/types/domain';

export interface PropertyInput {
  producerId: string;
  name: string;
  registrationNumber: string;
  city: string;
  state: string;
  totalAreaHectares: number;
  stateRegistration?: string;
  ruralEnvironmentalRegistry?: string;
  latitude?: number;
  longitude?: number;
  /** `null` apaga a demarcação salva; omitir mantém a atual. */
  boundary?: GeoPolygon | null;
}

export const propertiesService = {
  list: (
    params: { producerId?: string; search?: string; page?: number; pageSize?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.producerId) query.set('producerId', params.producerId);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return api<Paginated<Property>>(`/properties?${query.toString()}`);
  },
  get: (id: string) => api<Property>(`/properties/${id}`),
  create: (data: PropertyInput) =>
    api<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<PropertyInput, 'producerId'>>) =>
    api<Property>(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api<void>(`/properties/${id}`, { method: 'DELETE' }),
};
