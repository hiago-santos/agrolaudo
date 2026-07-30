import type { CodigoUnidade } from './unidades.js';

/**
 * As 15 culturas/atividades mapeadas com o cliente (ver conversagemini.md). Fonte
 * única do catálogo — o seed do banco (Etapa 2) e o gerador de documentos (Etapa 4)
 * consomem esta lista em vez de reimplementá-la.
 */
export type CategoriaAtividade =
  | 'GRAOS_FIBRAS'
  | 'PERMANENTES_FRUTICULTURA'
  | 'SEMIPERMANENTES'
  | 'PECUARIA_PASTAGEM';

export interface AtividadeConfig {
  slug: string;
  nome: string;
  categoria: CategoriaAtividade;
  /** Unidade usada por padrão ao adicionar a atividade num laudo novo. */
  unidadePadrao: CodigoUnidade;
  /** Unidades alternativas que o agrônomo pode escolher para esta atividade. */
  unidadesPermitidas: CodigoUnidade[];
  /** É uma linha de pecuária — habilita os campos de rebanho/taxa de lotação. */
  pecuaria: boolean;
  ordem: number;
}

export const ATIVIDADES: AtividadeConfig[] = [
  {
    slug: 'amendoim',
    nome: 'Amendoim',
    categoria: 'GRAOS_FIBRAS',
    unidadePadrao: 'SACA_56KG',
    unidadesPermitidas: ['SACA_56KG', 'TONELADA'],
    pecuaria: false,
    ordem: 1,
  },
  {
    slug: 'milho',
    nome: 'Milho',
    categoria: 'GRAOS_FIBRAS',
    unidadePadrao: 'SACA_60KG',
    unidadesPermitidas: ['SACA_60KG', 'TONELADA'],
    pecuaria: false,
    ordem: 2,
  },
  {
    slug: 'soja',
    nome: 'Soja',
    categoria: 'GRAOS_FIBRAS',
    unidadePadrao: 'SACA_60KG',
    unidadesPermitidas: ['SACA_60KG', 'TONELADA'],
    pecuaria: false,
    ordem: 3,
  },
  {
    slug: 'cafe',
    nome: 'Café',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'SACA_60KG',
    unidadesPermitidas: ['SACA_60KG'],
    pecuaria: false,
    ordem: 4,
  },
  {
    slug: 'laranja',
    nome: 'Laranja',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'CAIXA_40_8KG',
    unidadesPermitidas: ['CAIXA_40_8KG'],
    pecuaria: false,
    ordem: 5,
  },
  {
    slug: 'limao',
    nome: 'Limão',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'CAIXA_27KG',
    unidadesPermitidas: ['CAIXA_27KG', 'TONELADA'],
    pecuaria: false,
    ordem: 6,
  },
  {
    slug: 'tangerina',
    nome: 'Tangerina',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'CAIXA',
    unidadesPermitidas: ['CAIXA'],
    pecuaria: false,
    ordem: 7,
  },
  {
    slug: 'banana',
    nome: 'Banana',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'CAIXA_20KG',
    unidadesPermitidas: ['CAIXA_20KG', 'CAIXA_218KG', 'TONELADA'],
    pecuaria: false,
    ordem: 8,
  },
  {
    slug: 'abacate',
    nome: 'Abacate',
    categoria: 'PERMANENTES_FRUTICULTURA',
    unidadePadrao: 'TONELADA',
    unidadesPermitidas: ['TONELADA', 'CAIXA'],
    pecuaria: false,
    ordem: 9,
  },
  {
    slug: 'cana-de-acucar',
    nome: 'Cana de Açúcar',
    categoria: 'SEMIPERMANENTES',
    unidadePadrao: 'TONELADA',
    unidadesPermitidas: ['TONELADA'],
    pecuaria: false,
    ordem: 10,
  },
  {
    slug: 'cebola',
    nome: 'Cebola',
    categoria: 'SEMIPERMANENTES',
    unidadePadrao: 'SACA_20KG',
    unidadesPermitidas: ['SACA_20KG', 'TONELADA'],
    pecuaria: false,
    ordem: 11,
  },
  {
    slug: 'mandioca',
    nome: 'Mandioca',
    categoria: 'SEMIPERMANENTES',
    unidadePadrao: 'TONELADA',
    unidadesPermitidas: ['TONELADA'],
    pecuaria: false,
    ordem: 12,
  },
  {
    slug: 'eucalipto',
    nome: 'Eucalipto',
    categoria: 'SEMIPERMANENTES',
    unidadePadrao: 'METRO_CUBICO',
    unidadesPermitidas: ['METRO_CUBICO', 'STEREO', 'TONELADA'],
    pecuaria: false,
    ordem: 13,
  },
  {
    slug: 'pasto',
    nome: 'Pasto',
    categoria: 'PECUARIA_PASTAGEM',
    unidadePadrao: 'CABECA',
    unidadesPermitidas: ['CABECA', 'UA'],
    pecuaria: true,
    ordem: 14,
  },
  {
    slug: 'pecuaria-cria-recria-engorda',
    nome: 'Pecuária (Cria, Recria e Engorda)',
    categoria: 'PECUARIA_PASTAGEM',
    unidadePadrao: 'ARROBA',
    unidadesPermitidas: ['ARROBA', 'CABECA'],
    pecuaria: true,
    ordem: 15,
  },
];

export function getAtividadePorSlug(slug: string): AtividadeConfig | undefined {
  return ATIVIDADES.find((a) => a.slug === slug);
}
