import type { Activity, GeoPolygon, Producer, Property, Season } from '@/types/domain';

export interface ItemDraft {
  selected: boolean;
  activity: Activity;
  unit: string;
  areaHectares: string;
  productivity: string;
  unitPrice: string;
  costPerHectare: string;
  herdHeadCount: string;
}

export interface ProjectDraft {
  producer: Producer | null;
  property: Property | null;
  season: Season | null;
  agronomistId: string | null;
  issuingCity: string;
  notes: string;
  items: Record<string, ItemDraft>;
  /** Área delimitada no mapa como base do projeto (opcional). */
  financedAreaBoundary: GeoPolygon | null;
}

export function emptyDraft(): ProjectDraft {
  return {
    producer: null,
    property: null,
    season: null,
    agronomistId: null,
    issuingCity: '',
    notes: '',
    items: {},
    financedAreaBoundary: null,
  };
}
