import { describe, expect, it } from 'vitest';

import { geoJsonPolygonSchema, polygonAreaHectares, polygonCentroid } from './geo.js';

/**
 * A área e o centróide calculados aqui viram `boundaryAreaHectares` e o par
 * latitude/longitude da propriedade — são o que o agrônomo confere contra a
 * matrícula. Erro de fator (m² x ha) ou lat/lng invertidos passariam despercebidos
 * na tela, então ficam fixados aqui.
 */

/** Quadrado de 0,01° de lado com canto em (-20, -47) — região de Ituverava/SP. */
const SQUARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-47.0, -20.0],
      [-47.0, -20.01],
      [-46.99, -20.01],
      [-46.99, -20.0],
      [-47.0, -20.0],
    ] as [number, number][],
  ],
};

describe('polygonAreaHectares', () => {
  it('devolve hectares, não metros quadrados', () => {
    const hectares = polygonAreaHectares(SQUARE);
    // 0,01° de latitude ≈ 1,11 km; 0,01° de longitude a -20° ≈ 1,045 km.
    // ≈ 1,11 km x 1,045 km ≈ 1,16 km² ≈ 116 ha.
    expect(hectares).toBeGreaterThan(110);
    expect(hectares).toBeLessThan(120);
  });
});

describe('polygonCentroid', () => {
  it('devolve o centro do polígono com latitude e longitude na ordem certa', () => {
    const { latitude, longitude } = polygonCentroid(SQUARE);
    expect(latitude).toBeCloseTo(-20.005, 3);
    expect(longitude).toBeCloseTo(-46.995, 3);
  });
});

describe('geoJsonPolygonSchema', () => {
  it('aceita um anel fechado com 3 vértices', () => {
    expect(geoJsonPolygonSchema.safeParse(SQUARE).success).toBe(true);
  });

  it('rejeita um anel com menos de 3 vértices', () => {
    const result = geoJsonPolygonSchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [-47, -20],
          [-46.99, -20],
          [-47, -20],
        ],
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejeita coordenadas fora do intervalo de lat/lng', () => {
    const result = geoJsonPolygonSchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [-47, -200],
          [-47, -20.01],
          [-46.99, -20.01],
          [-47, -200],
        ],
      ],
    });
    expect(result.success).toBe(false);
  });
});
