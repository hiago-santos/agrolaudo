import type { UnitCode } from './units.js';

/**
 * As 15 culturas/atividades mapeadas com o cliente. Fonte única do catálogo — o
 * seed do banco e o gerador de documentos consomem esta lista em vez de
 * reimplementá-la. `name` fica em português (é o que aparece pro usuário); `slug`
 * é um identificador de código, em inglês.
 */
export type ActivityCategory =
  | 'GRAINS_FIBERS'
  | 'PERMANENT_FRUIT'
  | 'SEMI_PERMANENT'
  | 'LIVESTOCK_PASTURE';

export interface ActivityConfig {
  slug: string;
  name: string;
  category: ActivityCategory;
  /** Unidade usada por padrão ao adicionar a atividade num projeto novo. */
  defaultUnit: UnitCode;
  /** Unidades alternativas que o agrônomo pode escolher para esta atividade. */
  allowedUnits: UnitCode[];
  /** É uma linha de pecuária — habilita os campos de rebanho/taxa de lotação. */
  isLivestock: boolean;
  order: number;
}

export const ACTIVITIES: ActivityConfig[] = [
  {
    slug: 'peanut',
    name: 'Amendoim',
    category: 'GRAINS_FIBERS',
    defaultUnit: 'BAG_56KG',
    allowedUnits: ['BAG_56KG', 'TON'],
    isLivestock: false,
    order: 1,
  },
  {
    slug: 'corn',
    name: 'Milho',
    category: 'GRAINS_FIBERS',
    defaultUnit: 'BAG_60KG',
    allowedUnits: ['BAG_60KG', 'TON'],
    isLivestock: false,
    order: 2,
  },
  {
    slug: 'soybean',
    name: 'Soja',
    category: 'GRAINS_FIBERS',
    defaultUnit: 'BAG_60KG',
    allowedUnits: ['BAG_60KG', 'TON'],
    isLivestock: false,
    order: 3,
  },
  {
    slug: 'coffee',
    name: 'Café',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'BAG_60KG',
    allowedUnits: ['BAG_60KG'],
    isLivestock: false,
    order: 4,
  },
  {
    slug: 'orange',
    name: 'Laranja',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'BOX_40_8KG',
    allowedUnits: ['BOX_40_8KG'],
    isLivestock: false,
    order: 5,
  },
  {
    slug: 'lemon',
    name: 'Limão',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'BOX_27KG',
    allowedUnits: ['BOX_27KG', 'TON'],
    isLivestock: false,
    order: 6,
  },
  {
    slug: 'tangerine',
    name: 'Tangerina',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'BOX',
    allowedUnits: ['BOX'],
    isLivestock: false,
    order: 7,
  },
  {
    slug: 'banana',
    name: 'Banana',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'BOX_20KG',
    allowedUnits: ['BOX_20KG', 'BOX_218KG', 'TON'],
    isLivestock: false,
    order: 8,
  },
  {
    slug: 'avocado',
    name: 'Abacate',
    category: 'PERMANENT_FRUIT',
    defaultUnit: 'TON',
    allowedUnits: ['TON', 'BOX'],
    isLivestock: false,
    order: 9,
  },
  {
    slug: 'sugarcane',
    name: 'Cana de Açúcar',
    category: 'SEMI_PERMANENT',
    defaultUnit: 'TON',
    allowedUnits: ['TON'],
    isLivestock: false,
    order: 10,
  },
  {
    slug: 'onion',
    name: 'Cebola',
    category: 'SEMI_PERMANENT',
    defaultUnit: 'BAG_20KG',
    allowedUnits: ['BAG_20KG', 'TON'],
    isLivestock: false,
    order: 11,
  },
  {
    slug: 'cassava',
    name: 'Mandioca',
    category: 'SEMI_PERMANENT',
    defaultUnit: 'TON',
    allowedUnits: ['TON'],
    isLivestock: false,
    order: 12,
  },
  {
    slug: 'eucalyptus',
    name: 'Eucalipto',
    category: 'SEMI_PERMANENT',
    defaultUnit: 'CUBIC_METER',
    allowedUnits: ['CUBIC_METER', 'STEREO', 'TON'],
    isLivestock: false,
    order: 13,
  },
  {
    slug: 'pasture',
    name: 'Pasto',
    category: 'LIVESTOCK_PASTURE',
    defaultUnit: 'HEAD',
    allowedUnits: ['HEAD', 'AU'],
    isLivestock: true,
    order: 14,
  },
  {
    slug: 'cattle-raising',
    name: 'Pecuária (Cria, Recria e Engorda)',
    category: 'LIVESTOCK_PASTURE',
    defaultUnit: 'ARROBA',
    allowedUnits: ['ARROBA', 'HEAD'],
    isLivestock: true,
    order: 15,
  },
];

export function getActivityBySlug(slug: string): ActivityConfig | undefined {
  return ACTIVITIES.find((a) => a.slug === slug);
}
