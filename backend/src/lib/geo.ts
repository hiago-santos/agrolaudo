import { area } from '@turf/area';
import { centroid } from '@turf/centroid';
import { polygon as turfPolygon } from '@turf/helpers';
import { z } from 'zod';

/**
 * Validação de um polígono GeoJSON simples (um anel externo, sem furos) desenhado
 * no mapa. Coordenadas em [lng, lat], como o GeoJSON exige — a conversão pra
 * {lat,lng} do Google Maps acontece só no frontend.
 */
export const geoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z
        .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
        .min(4, 'O polígono precisa de pelo menos 3 vértices.'),
    )
    .min(1),
});

export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>;

/** Área do polígono em hectares (1 ha = 10.000 m²), calculada sobre a esfera. */
export function polygonAreaHectares(polygon: GeoJsonPolygon): number {
  const squareMeters = area(turfPolygon(polygon.coordinates));
  return squareMeters / 10_000;
}

/** Centróide do polígono, como {latitude, longitude} — usado pra preencher o pino do mapa. */
export function polygonCentroid(polygon: GeoJsonPolygon): { latitude: number; longitude: number } {
  const coordinates = centroid(turfPolygon(polygon.coordinates)).geometry.coordinates;
  return { latitude: coordinates[1] as number, longitude: coordinates[0] as number };
}
