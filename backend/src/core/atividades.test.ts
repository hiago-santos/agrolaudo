import { describe, expect, it } from 'vitest';

import { ATIVIDADES, getAtividadePorSlug } from './atividades.js';
import { UNIDADES } from './unidades.js';

describe('Catálogo de atividades', () => {
  it('tem exatamente as 15 atividades mapeadas com o cliente', () => {
    expect(ATIVIDADES).toHaveLength(15);
  });

  it('não tem slugs duplicados', () => {
    const slugs = ATIVIDADES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('toda unidadePadrao está dentro de unidadesPermitidas e existe no catálogo de unidades', () => {
    for (const atividade of ATIVIDADES) {
      expect(atividade.unidadesPermitidas).toContain(atividade.unidadePadrao);
      expect(UNIDADES[atividade.unidadePadrao]).toBeDefined();
      for (const unidade of atividade.unidadesPermitidas) {
        expect(UNIDADES[unidade]).toBeDefined();
      }
    }
  });

  it('marca a Pecuária (Cria, Recria e Engorda) e o Pasto como atividades de pecuária', () => {
    expect(getAtividadePorSlug('pecuaria-cria-recria-engorda')?.pecuaria).toBe(true);
    expect(getAtividadePorSlug('pasto')?.pecuaria).toBe(true);
    expect(getAtividadePorSlug('soja')?.pecuaria).toBe(false);
  });

  it('busca a Cana-de-Açúcar e a Soja usadas no teste dourado', () => {
    expect(getAtividadePorSlug('cana-de-acucar')?.nome).toBe('Cana de Açúcar');
    expect(getAtividadePorSlug('soja')?.unidadePadrao).toBe('SACA_60KG');
  });
});
