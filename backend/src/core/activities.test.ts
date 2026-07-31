import { describe, expect, it } from 'vitest';

import { ACTIVITIES, getActivityBySlug } from './activities.js';
import { UNITS } from './units.js';

describe('Catálogo de atividades', () => {
  it('tem exatamente as 15 atividades mapeadas com o cliente', () => {
    expect(ACTIVITIES).toHaveLength(15);
  });

  it('não tem slugs duplicados', () => {
    const slugs = ACTIVITIES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('toda defaultUnit está dentro de allowedUnits e existe no catálogo de unidades', () => {
    for (const activity of ACTIVITIES) {
      expect(activity.allowedUnits).toContain(activity.defaultUnit);
      expect(UNITS[activity.defaultUnit]).toBeDefined();
      for (const unit of activity.allowedUnits) {
        expect(UNITS[unit]).toBeDefined();
      }
    }
  });

  it('marca a Pecuária (Cria, Recria e Engorda) e o Pasto como atividades de pecuária', () => {
    expect(getActivityBySlug('cattle-raising')?.isLivestock).toBe(true);
    expect(getActivityBySlug('pasture')?.isLivestock).toBe(true);
    expect(getActivityBySlug('soybean')?.isLivestock).toBe(false);
  });

  it('busca a Cana-de-Açúcar e a Soja usadas no teste dourado', () => {
    expect(getActivityBySlug('sugarcane')?.name).toBe('Cana de Açúcar');
    expect(getActivityBySlug('soybean')?.defaultUnit).toBe('BAG_60KG');
  });
});
