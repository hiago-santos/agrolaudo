import {
  APIProvider,
  Map,
  Marker,
  Polygon,
  Polyline,
  useApiIsLoaded,
  useMapsLibrary,
  type MapEvent,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Check, Crosshair, Maximize2, PenLine, Search, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { formatCoordinates, formatNumber } from '@/lib/format';
import {
  parseCoordinates,
  pathToPolygon,
  polygonAreaHectares,
  polygonCentroid,
  polygonToPath,
  type LatLng,
} from '@/lib/geo';
import type { GeoPolygon } from '@/types/domain';

/** Centro geográfico aproximado do Brasil — só usado quando não há nada pra enquadrar. */
const FALLBACK_CENTER: LatLng = { lat: -15.78, lng: -47.93 };

const DRAWN_COLOR = '#3f7d5c';
const REFERENCE_COLOR = '#e2c675';

export interface PolygonMapFieldProps {
  polygon: GeoPolygon | null;
  onPolygonChange?: (polygon: GeoPolygon | null) => void;
  /** Ponto inicial da câmera quando ainda não há polígono desenhado. */
  center?: LatLng | null;
  editable?: boolean;
  /** Número (px) ou qualquer valor CSS — use '100%' pra preencher um container flex. */
  height?: number | string;
  /** Contorno auxiliar somente-leitura (ex.: a propriedade inteira, ao desenhar a área financiada). */
  referencePolygon?: GeoPolygon | null;
  referenceLabel?: string;
  className?: string;
}

/**
 * Campo de mapa pra demarcar uma área. Fluxo: buscar o local (endereço ou coordenada)
 * → ligar o modo desenho e clicar os vértices → concluir e ajustar arrastando as alças
 * do polígono. Área e centróide são recalculados a cada mudança, com os mesmos
 * cálculos que o backend usa ao persistir (ver `lib/geo.ts`).
 */
export function PolygonMapField({ height = 360, className, ...props }: PolygonMapFieldProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return (
      <div
        style={{ height }}
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-border-strong bg-bg-subtle p-4 text-center text-xs text-text-tertiary',
          className,
        )}
      >
        Defina VITE_GOOGLE_MAPS_API_KEY no .env do frontend pra habilitar o mapa.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapField height={height} className={className} {...props} />
    </APIProvider>
  );
}

function MapField({
  polygon,
  onPolygonChange,
  center,
  editable = true,
  height,
  referencePolygon,
  referenceLabel,
  className,
}: PolygonMapFieldProps) {
  const apiLoaded = useApiIsLoaded();
  const geocodingLib = useMapsLibrary('geocoding');

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [polygonInstance, setPolygonInstance] = useState<google.maps.Polygon | null>(null);
  const [path, setPath] = useState<LatLng[]>(() => polygonToPath(polygon));
  const [drawing, setDrawing] = useState(() => editable && polygonToPath(polygon).length < 3);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /** Última forma que ESTE componente emitiu — distingue eco do próprio commit de
   *  uma troca vinda de fora (outra propriedade sendo editada, por exemplo). */
  const emitted = useRef<GeoPolygon | null>(polygon);

  const referencePath = useMemo(() => polygonToPath(referencePolygon), [referencePolygon]);

  const currentPolygon = useMemo(() => pathToPolygon(path), [path]);
  const areaHectares = currentPolygon ? polygonAreaHectares(currentPolygon) : null;
  const centroidPoint = currentPolygon ? polygonCentroid(currentPolygon) : null;

  useEffect(() => {
    if (polygon === emitted.current) return;
    emitted.current = polygon;
    setPath(polygonToPath(polygon));
  }, [polygon]);

  function commit(next: LatLng[]) {
    const nextPolygon = pathToPolygon(next);
    emitted.current = nextPolygon;
    setPath(next);
    onPolygonChange?.(nextPolygon);
  }

  // Mantém a última versão de path/commit acessível pros listeners nativos do
  // Google Maps, que são registrados uma vez só e não veem closures novas.
  const latest = useRef({ path, commit });
  useEffect(() => {
    latest.current = { path, commit };
  });

  function fitTo(target: LatLng[]) {
    if (!map || target.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    target.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);
  }

  // Enquadra o que já existe assim que o mapa fica pronto — abrir a edição de uma
  // propriedade já demarcada cai direto na fazenda, sem procurar no zoom do Brasil.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !map) return;
    const initial = path.length >= 3 ? path : referencePath;
    if (initial.length < 3) return;
    fitted.current = true;
    fitTo(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, path, referencePath]);

  // Clique direito num vértice remove aquele vértice (a API nativa não faz isso sozinha).
  useEffect(() => {
    if (!polygonInstance || !editable) return;
    const listener = polygonInstance.addListener(
      'rightclick',
      (event: google.maps.PolyMouseEvent) => {
        if (event.vertex === undefined) return;
        const { path: currentPath, commit: currentCommit } = latest.current;
        currentCommit(currentPath.filter((_, index) => index !== event.vertex));
      },
    );
    return () => listener.remove();
  }, [polygonInstance, editable]);

  function handleMapClick(event: MapMouseEvent) {
    if (!editable || !drawing || !event.detail.latLng) return;
    commit([...path, event.detail.latLng]);
  }

  function handlePathsChanged(paths: google.maps.LatLng[][]) {
    const ring = paths[0] ?? [];
    commit(ring.map((point) => ({ lat: point.lat(), lng: point.lng() })));
  }

  async function runSearch() {
    const term = search.trim();
    if (!term || !map) return;

    const coordinates = parseCoordinates(term);
    if (coordinates) {
      setSearchError(null);
      map.panTo(coordinates);
      map.setZoom(16);
      return;
    }

    if (!geocodingLib) {
      setSearchError('Busca por endereço indisponível no momento.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const { results } = await new geocodingLib.Geocoder().geocode({
        address: term,
        componentRestrictions: { country: 'BR' },
      });
      const best = results[0];
      if (!best) {
        setSearchError('Nenhum local encontrado para essa busca.');
        return;
      }
      if (best.geometry.viewport) {
        map.fitBounds(best.geometry.viewport);
      } else {
        map.panTo(best.geometry.location);
        map.setZoom(15);
      }
    } catch {
      setSearchError('Busca indisponível — habilite a Geocoding API na chave do Google.');
    } finally {
      setSearching(false);
    }
  }

  const hasShape = path.length >= 3;
  const initialCenter = center ?? path[0] ?? referencePath[0] ?? FALLBACK_CENTER;
  const initialZoom = center || path.length > 0 || referencePath.length > 0 ? 14 : 4;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchError(null);
              }}
              // Enter aqui não pode submeter o formulário que envolve o mapa.
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void runSearch();
              }}
              placeholder="Buscar município, endereço ou -20.123456, -47.654321"
              className="pl-9"
              aria-label="Buscar local no mapa"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void runSearch()}>
            {searching ? <Spinner className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            Buscar
          </Button>
          <Button
            type="button"
            variant={drawing ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setDrawing((value) => !value)}
          >
            {drawing && hasShape ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Concluir
              </>
            ) : (
              <>
                <PenLine className="h-3.5 w-3.5" />
                {drawing ? 'Desenhando' : 'Desenhar'}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasShape && referencePath.length < 3}
            onClick={() => fitTo(hasShape ? path : referencePath)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Enquadrar
          </Button>
        </div>
      )}

      {searchError && <p className="text-xs text-danger">{searchError}</p>}

      <div
        style={{ height }}
        className={cn(
          'relative overflow-hidden rounded-lg border border-border',
          editable && drawing && 'ring-2 ring-accent-ring',
        )}
      >
        <Map
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          mapTypeId="hybrid"
          gestureHandling="greedy"
          streetViewControl={false}
          fullscreenControl
          mapTypeControl
          clickableIcons={false}
          draggableCursor={editable && drawing ? 'crosshair' : undefined}
          onTilesLoaded={(event: MapEvent) => setMap(event.map)}
          onClick={handleMapClick}
        >
          {referencePath.length >= 3 && (
            <Polygon
              paths={referencePath}
              clickable={false}
              strokeColor={REFERENCE_COLOR}
              strokeOpacity={0.9}
              strokeWeight={2}
              fillOpacity={0}
            />
          )}

          {hasShape && (
            <Polygon
              ref={setPolygonInstance}
              paths={path}
              editable={editable}
              onPathsChanged={editable ? handlePathsChanged : undefined}
              strokeColor={DRAWN_COLOR}
              strokeWeight={2}
              fillColor={DRAWN_COLOR}
              fillOpacity={0.25}
            />
          )}

          {/* Traço parcial enquanto ainda não há vértices suficientes pra fechar a área. */}
          {!hasShape && path.length > 0 && (
            <Polyline path={path} strokeColor={DRAWN_COLOR} strokeWeight={2} />
          )}

          {apiLoaded && centroidPoint && (
            <Marker
              position={centroidPoint}
              clickable={false}
              title="Centro da área — referência de localização"
              zIndex={5}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: '#ffffff',
                fillOpacity: 1,
                strokeColor: DRAWN_COLOR,
                strokeWeight: 3,
              }}
            />
          )}
        </Map>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-0.5 text-xs text-text-secondary">
          {areaHectares !== null ? (
            <p>
              <span className="font-medium text-text">{formatNumber(areaHectares)} ha</span> ·{' '}
              {path.length} vértices
            </p>
          ) : (
            <p>
              {editable
                ? drawing
                  ? 'Clique no mapa para marcar os vértices (mínimo 3).'
                  : 'Ligue o modo desenho para marcar a área.'
                : 'Nenhuma área demarcada.'}
            </p>
          )}

          {centroidPoint && (
            <p className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary">
              <Crosshair className="h-3 w-3 shrink-0" />
              {formatCoordinates(centroidPoint.lat, centroidPoint.lng)}
            </p>
          )}

          {referenceLabel && referencePath.length >= 3 && (
            <p className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <span
                aria-hidden
                className="inline-block h-2 w-3 shrink-0 rounded-sm border"
                style={{ borderColor: REFERENCE_COLOR }}
              />
              {referenceLabel}
            </p>
          )}

          {editable && hasShape && (
            <p className="text-[11px] text-text-tertiary">
              Arraste as alças para ajustar · clique direito num vértice para removê-lo.
            </p>
          )}
        </div>

        {editable && path.length > 0 && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => commit(path.slice(0, -1))}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Desfazer ponto
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => commit([])}>
              <Trash2 className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
