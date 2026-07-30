import { api } from '@/lib/api';
import type { Agronomo } from '@/types/domain';

export interface AgronomoInput {
  nome: string;
  cpf: string;
  crea: string;
  regiao?: string;
  cidadeEmissao: string;
  email: string;
  senha: string;
}

export const agronomosService = {
  listar: () => api<Agronomo[]>('/agronomos'),
  obter: (id: string) => api<Agronomo>(`/agronomos/${id}`),
  criar: (data: AgronomoInput) => api<Agronomo>('/agronomos', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<Omit<AgronomoInput, 'cpf' | 'email' | 'senha'>>) =>
    api<Agronomo>(`/agronomos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
