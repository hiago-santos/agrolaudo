import { api } from '@/lib/api';
import type { Signature, SignatureType } from '@/types/domain';

export const signaturesService = {
  collect: (projectId: string, type: SignatureType, imageBase64: string) =>
    api<Signature>(`/projects/${projectId}/signatures`, {
      method: 'POST',
      body: JSON.stringify({ type, imageBase64 }),
    }),

  generateLink: (projectId: string, type: SignatureType) =>
    api<{ link: string; token: string; signature: Signature }>(`/projects/${projectId}/signatures/link`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
};
