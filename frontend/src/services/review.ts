import { api } from '@/lib/api';
import type { Project } from '@/types/domain';

export interface BankReviewInput {
  decision: 'APPROVED' | 'REJECTED';
  creditLimit?: number;
  notes?: string;
}

export const reviewService = {
  submit: (projectId: string, data: BankReviewInput) =>
    api<Project>(`/projects/${projectId}/review`, { method: 'POST', body: JSON.stringify(data) }),
};
