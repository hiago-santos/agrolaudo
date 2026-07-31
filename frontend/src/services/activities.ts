import { api } from '@/lib/api';
import type { Activity } from '@/types/domain';

export const activitiesService = {
  list: (params: { active?: boolean; isLivestock?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.active !== undefined) query.set('active', String(params.active));
    if (params.isLivestock !== undefined) query.set('isLivestock', String(params.isLivestock));
    return api<Activity[]>(`/activities?${query.toString()}`);
  },
  get: (id: string) => api<Activity>(`/activities/${id}`),
};
