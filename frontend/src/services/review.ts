import { api } from '@/lib/api';
import type { Project, ProjectMessage } from '@/types/domain';

export interface BankReviewInput {
  decision: 'APPROVED' | 'REJECTED';
  creditLimit?: number;
  notes?: string;
}

export interface BankReviewResult {
  project: Project;
  publicLink: string;
}

export const reviewService = {
  submit: (projectId: string, data: BankReviewInput) =>
    api<BankReviewResult>(`/projects/${projectId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestAdjustment: (projectId: string, message: string) =>
    api<ProjectMessage>(`/projects/${projectId}/request-adjustment`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  resubmit: (projectId: string, note?: string) =>
    api<Project>(`/projects/${projectId}/resubmit-review`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  getPublicLink: (projectId: string) =>
    api<{ link: string; token: string }>(`/projects/${projectId}/public-link`, {
      method: 'POST',
    }),
};
