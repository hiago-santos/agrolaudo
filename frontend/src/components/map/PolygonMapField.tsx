import { area } from '@turf/area';
import { polygon as turfPolygon } from '@turf/helpers';
import { APIProvider, Map, Polygon, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { Redo2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { GeoPolygon } from '@/types/domain';

interface LatLng {
  lat: number;
  lng: number;
}

/** Centro geográfico aproximado do Brasil — usado quando ainda não há nada desenhado. */
const FALLBACK_CENTER: LatLng = { lat: -15.78, lng: -47.93 };

function polygonToPoints(polygon: GeoPolygon | null | undefined): LatLng[] {
  const ring = polygon?.coordinates[0];
  if (!ring) return [];
  // O anel GeoJSON é fechado (primeiro === último ponto) — removido aqui pra edição.
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat: lat as number, lng: lng as number }));
}

function pointsToPolygon(points: LatLng[]): GeoPolygon | null {
  if (points.length < 3) return null;
  const ring = points.map((p): [number, number] => [p.lng, p.lat]);
  ring.push(ring[0] as [number, number]);
  return { type: 'Polygon', coordinates: [ring] };
}

function areaHectaresOf(points: LatLng[]): number | null {
  const polygon = pointsToPolygon(points);
  if (!polygon) return null;
  try {
    return area(turfPolygon(polygon.coordinates)) / 10_000;
  } catch {
    return null;
  }
}

interface PolygonMapFieldProps {
  polygon: GeoPolygon | null;
  onPolygonChange: (polygon: GeoPolygon | null) => void;
  /** Quando omitido, centraliza no que já existir desenhado ou no centro do Brasil. */
  center?: LatLng | null;
  editable?: boolean;
  height?: number;
  /** Contorno auxiliar somente-leitura (ex.: a propriedade inteira, ao desenhar a área financiada). */
  referencePolygon?: GeoPolygon | null;
  referenceLabel?: string;
}

/**
 * Campo de mapa reutilizável pra desenhar um polígono (contorno de propriedade ou área
 * financiada de projeto). Clique adiciona vértices; com 3+ vértices o polígono fica
 * arrastável (arraste um vértice pra ajustar, clique direito nele pra remover).
 */
export function PolygonMapField({
  polygon,
  onPolygonChange,
  center,
  editable = true,
  height = 360,
  referencePolygon,
  referenceLabel,
}: PolygonMapFieldProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  const [points, setPoints] = useState<LatLng[]>(() => polygonToPoints(polygon));

  const referencePoints = useMemo(() => polygonToPoints(referencePolygon), [referencePolygon]);
  const areaHectares = useMemo(() => areaHectaresOf(points), [points]);

  function commit(next: LatLng[]) {
    setPoints(next);
    onPolygonChange(pointsToPolygon(next));
  }

  function handleMapClick(event: MapMouseEvent) {
    if (!editable || !event.detail.latLng) return;
    commit([...points, event.detail.latLng]);
  }

  function handlePathsChanged(paths: google.maps.LatLng[][]) {
    const ring = paths[0] ?? [];
    commit(ring.map((p) => ({ lat: p.lat(), lng: p.lng() })));
  }

  function undoLastPoint() {
    commit(points.slice(0, -1));
  }

  function clearAll() {
    commit([]);
  }

  if (!apiKey) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-dashed border-border-strong bg-bg-subtle p-4 text-center text-xs text-text-tertiary"
      >
        Defina VITE_GOOGLE_MAPS_API_KEY no .env do frontend pra habilitar o mapa.
      </div>
    );
  }

  const firstReferencePoint = referencePoints[0];
  const firstPoint = points[0];
  const mapCenter = center ?? firstPoint ?? firstReferencePoint ?? FALLBACK_CENTER;
  const mapZoom = center || firstPoint || firstReferencePoint ? 14 : 4;

  return (
    <div className="space-y-2">
      <div style={{ height }} className="overflow-hidden rounded-lg border border-border">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={mapZoom}
            mapTypeId="hybrid"
            gestureHandling="greedy"
            streetViewControl={false}
            fullscreenControl={false}
            onClick={editable ? handleMapClick : undefined}
          >
            {referencePoints.length >= 3 && (
              <Polygon
                paths={referencePoints}
                editable={false}
                clickable={false}
                strokeColor="#e2c675"
                strokeOpacity={0.9}
                strokeWeight={2}
                fillOpacity={0}
              />
            )}
            {points.length > 0 && (
              <Polygon
                paths={points}
                editable={editable && points.length >= 3}
                onPathsChanged={editable ? handlePathsChanged : undefined}
                strokeColor="#3f7d5c"
                strokeWeight={2}
                fillColor="#3f7d5c"
                fillOpacity={0.25}
              />
            )}
          </Map>
        </APIProvider>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
        <span>
          {referenceLabel && referencePoints.length >= 3 ? `${referenceLabel} em amarelo · ` : ''}
          {areaHectares !== null
            ? `${areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha desenhados`
            : editable
              ? 'Clique no mapa pra desenhar o polígono.'
              : 'Nenhuma área desenhada.'}
        </span>
        {editable && points.length > 0 && (
          <div className="flex gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={undoLastPoint}>
              <Redo2 className="h-3.5 w-3.5" />
              Desfazer ponto
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
