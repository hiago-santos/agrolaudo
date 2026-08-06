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
import { Check, Crosshair, Loader2, Maximize2, PenLine, Search, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { formatCoordinates, formatNumber } from '@/lib/format';
import {
  parseCoordinates,
  parseLatLngPair,
  pathToPolygon,
  polygonAreaHectares,
  polygonCentroid,
  polygonToPath,
  type LatLng,
} from '@/lib/geo';
import { useThemeStore } from '@/stores/theme';
import type { GeoPolygon } from '@/types/domain';

/** Centro geográfico aproximado do Brasil — só usado quando não há nada pra enquadrar. */
const FALLBACK_CENTER: LatLng = { lat: -15.78, lng: -47.93 };

/**
 * Lê uma cor do tema (custom property de `index.css`) já resolvida — os overlays do
 * Google Maps são desenhados em canvas/SVG fora da árvore de estilos do React e não
 * herdam `var(--x)`, então o valor precisa ser lido do computed style. Reage à troca
 * de tema porque o `useThemeStore` já é a fonte da verdade de qual tema está ativo.
 */
function useThemeColor(variable: string, fallback: string): string {
  const theme = useThemeStore((s) => s.theme);
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (value) setColor(value);
  }, [variable, theme]);
  return color;
}

export interface LocationMapFieldProps {
  /** Contorno principal — omitir `onBoundaryChange` deixa o campo só-leitura. */
  boundary: GeoPolygon | null;
  onBoundaryChange?: (boundary: GeoPolygon | null) => void;
  /**
   * Referência de localização independente do contorno (ex.: a sede da propriedade nem
   * sempre fica no centro geométrico do perímetro). Passar `onPointChange` liga a edição
   * — o componente já desenha os campos de lat/lng e o atalho "usar centro do desenho".
   * Omitida por completo, o marcador mostra o centróide geométrico calculado ao vivo.
   */
  point?: LatLng | null;
  onPointChange?: (point: LatLng | null) => void;
  pointLabel?: string;
  /** Contorno auxiliar somente-leitura (ex.: a propriedade inteira, ao desenhar a área financiada). */
  referenceBoundary?: GeoPolygon | null;
  referenceLabel?: string;
  /** Câmera inicial quando ainda não há nada salvo pra enquadrar. */
  center?: LatLng | null;
  /** Número (px) ou qualquer valor CSS — use '100%' pra preencher um container flex. */
  height?: number | string;
  className?: string;
}

/**
 * Componente genérico pra qualquer demarcação geográfica do sistema — contorno de
 * propriedade, área financiada de projeto, com ou sem um ponto de referência editável
 * à parte. Fluxo de desenho: buscar o local (endereço ou coordenada) → ligar o modo
 * desenho e clicar os vértices → concluir e ajustar arrastando as alças do polígono.
 * Área e centróide usam os mesmos cálculos que o backend persiste (ver `lib/geo.ts`).
 */
export function LocationMapField({ height = 360, className, ...props }: LocationMapFieldProps) {
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
  boundary,
  onBoundaryChange,
  point,
  onPointChange,
  pointLabel = 'Referência de localização',
  center,
  height,
  referenceBoundary,
  referenceLabel,
  className,
}: LocationMapFieldProps) {
  const editable = !!onBoundaryChange;
  const pointEditable = onPointChange !== undefined;
  const inputId = useId();

  const apiLoaded = useApiIsLoaded();
  const geocodingLib = useMapsLibrary('geocoding');
  const drawnColor = useThemeColor('--accent', '#3f7d5c');
  const referenceColor = useThemeColor('--gold', '#e2c675');

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [polygonInstance, setPolygonInstance] = useState<google.maps.Polygon | null>(null);
  const [path, setPath] = useState<LatLng[]>(() => polygonToPath(boundary));
  const [drawing, setDrawing] = useState(() => editable && polygonToPath(boundary).length < 3);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [latInput, setLatInput] = useState(() => (point ? point.lat.toFixed(6) : ''));
  const [lngInput, setLngInput] = useState(() => (point ? point.lng.toFixed(6) : ''));

  /** Última forma/ponto que ESTE componente emitiu — distingue eco do próprio commit
   *  de uma troca vinda de fora (outra propriedade sendo editada, por exemplo). */
  const emittedBoundary = useRef<GeoPolygon | null>(boundary);
  const emittedPoint = useRef<LatLng | null>(point ?? null);

  const referencePath = useMemo(() => polygonToPath(referenceBoundary), [referenceBoundary]);
  const currentPolygon = useMemo(() => pathToPolygon(path), [path]);
  const areaHectares = currentPolygon ? polygonAreaHectares(currentPolygon) : null;
  const centroidPoint = currentPolygon ? polygonCentroid(currentPolygon) : null;
  const displayedPoint = pointEditable ? (point ?? null) : centroidPoint;

  useEffect(() => {
    if (boundary === emittedBoundary.current) return;
    emittedBoundary.current = boundary;
    setPath(polygonToPath(boundary));
  }, [boundary]);

  useEffect(() => {
    if (!pointEditable) return;
    const next = point ?? null;
    if (next === emittedPoint.current) return;
    emittedPoint.current = next;
    setLatInput(next ? next.lat.toFixed(6) : '');
    setLngInput(next ? next.lng.toFixed(6) : '');
  }, [point, pointEditable]);

  function emitPoint(next: LatLng | null) {
    emittedPoint.current = next;
    setLatInput(next ? next.lat.toFixed(6) : '');
    setLngInput(next ? next.lng.toFixed(6) : '');
    onPointChange?.(next);
  }

  function commitBoundary(next: LatLng[]) {
    const nextPolygon = pathToPolygon(next);
    emittedBoundary.current = nextPolygon;
    setPath(next);
    onBoundaryChange?.(nextPolygon);
    // Primeiro desenho sem ponto ainda definido: sugere o centro como partida — depois
    // disso quem decide é o atalho "usar centro do desenho" ou o próprio usuário.
    if (pointEditable && nextPolygon && !point) {
      const centroid = polygonCentroid(nextPolygon);
      if (centroid) emitPoint(centroid);
    }
  }

  // Mantém a última versão de path/commit acessível pros listeners nativos do
  // Google Maps, que são registrados uma vez só e não veem closures novas.
  const latest = useRef({ path, commitBoundary });
  useEffect(() => {
    latest.current = { path, commitBoundary };
  });

  function fitTo(target: LatLng[]) {
    if (!map || target.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    target.forEach((p) => bounds.extend(p));
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
        const { path: currentPath, commitBoundary: commit } = latest.current;
        commit(currentPath.filter((_, index) => index !== event.vertex));
      },
    );
    return () => listener.remove();
  }, [polygonInstance, editable]);

  function handleMapClick(event: MapMouseEvent) {
    if (!editable || !drawing || !event.detail.latLng) return;
    commitBoundary([...path, event.detail.latLng]);
  }

  function handlePathsChanged(paths: google.maps.LatLng[][]) {
    const ring = paths[0] ?? [];
    commitBoundary(ring.map((p) => ({ lat: p.lat(), lng: p.lng() })));
  }

  function handlePointInput(nextLat: string, nextLng: string) {
    setLatInput(nextLat);
    setLngInput(nextLng);
    const parsed = parseLatLngPair(nextLat, nextLng);
    emittedPoint.current = parsed;
    onPointChange?.(parsed);
  }

  function useDrawnCentroid() {
    if (centroidPoint) emitPoint(centroidPoint);
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
    <div className={cn('space-y-2', className)}>
      <div className="overflow-hidden rounded-lg border border-border">
        {editable && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-subtle px-3 py-2">
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
                className="bg-surface pl-9"
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

        <div style={{ height }} className="relative">
          {!apiLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-bg-subtle text-xs text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando mapa...
            </div>
          )}
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
                strokeColor={referenceColor}
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
                strokeColor={drawnColor}
                strokeWeight={2}
                fillColor={drawnColor}
                fillOpacity={0.25}
              />
            )}

            {/* Traço parcial enquanto ainda não há vértices suficientes pra fechar a área. */}
            {!hasShape && path.length > 0 && (
              <Polyline path={path} strokeColor={drawnColor} strokeWeight={2} />
            )}

            {apiLoaded && displayedPoint && (
              <Marker
                position={displayedPoint}
                clickable={false}
                title={pointLabel}
                zIndex={5}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  strokeColor: drawnColor,
                  strokeWeight: 3,
                }}
              />
            )}
          </Map>
        </div>
      </div>

      {searchError && <p className="text-xs text-danger">{searchError}</p>}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs text-text-secondary">
        <div className="min-w-0 space-y-0.5">
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

          {displayedPoint && (
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary">
              <Crosshair className="h-3 w-3 shrink-0" style={{ color: drawnColor }} />
              {formatCoordinates(displayedPoint.lat, displayedPoint.lng)}
            </p>
          )}

          {referenceLabel && referencePath.length >= 3 && (
            <p className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <span
                aria-hidden
                className="inline-block h-2 w-3 shrink-0 rounded-sm border"
                style={{ borderColor: referenceColor }}
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
              onClick={() => commitBoundary(path.slice(0, -1))}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Desfazer ponto
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => commitBoundary([])}>
              <Trash2 className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        )}
      </div>

      {pointEditable && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-bg-subtle/60 p-3">
          <div>
            <Label htmlFor={`${inputId}-lat`}>Latitude</Label>
            <Input
              id={`${inputId}-lat`}
              type="number"
              step="0.000001"
              value={latInput}
              onChange={(event) => handlePointInput(event.target.value, lngInput)}
              placeholder="-20.540000"
            />
          </div>
          <div>
            <Label htmlFor={`${inputId}-lng`}>Longitude</Label>
            <Input
              id={`${inputId}-lng`}
              type="number"
              step="0.000001"
              value={lngInput}
              onChange={(event) => handlePointInput(latInput, event.target.value)}
              placeholder="-47.385000"
            />
          </div>
          {centroidPoint && (
            <p className="col-span-2 text-[11px] text-text-tertiary">
              Centro do desenho: {formatCoordinates(centroidPoint.lat, centroidPoint.lng)} ·{' '}
              <button
                type="button"
                onClick={useDrawnCentroid}
                className="rounded-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                usar
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
