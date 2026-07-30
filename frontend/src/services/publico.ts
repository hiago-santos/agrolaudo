import { api } from '@/lib/api';
import type { StatusLaudo, TipoAssinatura } from '@/types/domain';

export interface LaudoPublico {
  numero: string;
  status: StatusLaudo;
  tipo: TipoAssinatura;
  jaAssinado: boolean;
  html: string;
}

export interface VerificacaoPublica {
  valido: boolean;
  numero: string;
  status: StatusLaudo;
  produtor: string;
  propriedade: string;
  safra: string;
  agronomo: { nome: string; crea: string };
  dataEmissao: string;
  assinaturas: Array<{ tipo: TipoAssinatura; nomeSignatario: string; assinadoEm: string | null }>;
}

export const publicoService = {
  obterLaudo: (laudoId: string, token: string) =>
    api<LaudoPublico>(`/publico/laudos/${laudoId}?token=${encodeURIComponent(token)}`),

  assinar: (laudoId: string, token: string, imagemBase64: string) =>
    api<unknown>(`/publico/laudos/${laudoId}/assinar`, {
      method: 'POST',
      body: JSON.stringify({ token, imagemBase64 }),
    }),

  verificar: (hash: string) => api<VerificacaoPublica>(`/publico/verificar/${hash}`),
};
