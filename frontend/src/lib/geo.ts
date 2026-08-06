import { area } from '@turf/area';
import { centroid } from '@turf/centroid';
import { polygon as turfPolygon } from '@turf/helpers';

import type { GeoPolygon } from '@/types/domain';

/**
 * Ponte entre o GeoJSON que persistimos (coordenadas em [lng, lat]) e o formato
 * {lat, lng} que o Google Maps usa. Os cálculos de área/centróide são os MESMOS
 * do backend (`backend/src/lib/geo.ts`, também via turf) — o número que aparece
 * enquanto o usuário desenha é o mesmo que vai ser salvo.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Vértices editáveis do polígono — sem o ponto de fechamento que o GeoJSON exige. */
export function polygonToPath(polygon: GeoPolygon | null | undefined): LatLng[] {
  const ring = polygon?.coordinates[0];
  if (!ring) return [];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat: lat as number, lng: lng as number }));
}

/** Fecha o anel e devolve GeoJSON — null enquanto não houver 3 vértices. */
export function pathToPolygon(path: LatLng[]): GeoPolygon | null {
  if (path.length < 3) return null;
  const ring = path.map((point): [number, number] => [point.lng, point.lat]);
  ring.push(ring[0] as [number, number]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function polygonAreaHectares(polygon: GeoPolygon): number | null {
  try {
    return area(turfPolygon(polygon.coordinates)) / 10_000;
  } catch {
    return null;
  }
}

/** Centro geométrico — a referência de localização da propriedade. */
export function polygonCentroid(polygon: GeoPolygon): LatLng | null {
  try {
    const coordinates = centroid(turfPolygon(polygon.coordinates)).geometry.coordinates;
    return { lat: coordinates[1] as number, lng: coordinates[0] as number };
  } catch {
    return null;
  }
}

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Aceita "lat, lng" em graus decimais — o formato que sai do "copiar coordenadas"
 * do Google Maps e dos aparelhos de GPS. Devolve null pra qualquer outra coisa,
 * que o chamador trata como busca por endereço.
 */
export function parseCoordinates(input: string): LatLng | null {
  const match = COORDINATE_PATTERN.exec(input);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
