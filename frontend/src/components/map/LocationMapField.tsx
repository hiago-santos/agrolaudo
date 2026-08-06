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
import {
  ArrowsOut,
  ArrowUUpLeft,
  Check,
  CircleNotch,
  Crosshair,
  MagnifyingGlass,
  Minus,
  PenNib,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes } from 'react';

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

type MapLayer = 'hybrid' | 'satellite' | 'roadmap';

const MAP_LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'roadmap', label: 'Mapa' },
  { id: 'hybrid', label: 'Híbrido' },
  { id: 'satellite', label: 'Satélite' },
];

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

function MapControlButton({
  className,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center text-text transition-colors',
        'hover:bg-bg-subtle active:bg-border/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent-soft text-accent',
        className,
      )}
      {...props}
    />
  );
}

/** Controles próprios — zoom, camada e enquadrar. Substitui a UI padrão do Google. */
function MapChrome({
  map,
  layer,
  onLayerChange,
  canFit,
  onFit,
}: {
  map: google.maps.Map | null;
  layer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  canFit: boolean;
  onFit: () => void;
}) {
  function zoomBy(delta: number) {
    if (!map) return;
    const current = map.getZoom() ?? 14;
    map.setZoom(Math.min(21, Math.max(3, current + delta)));
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] p-2.5">
      <div className="pointer-events-auto absolute right-2.5 top-2.5 flex flex-col overflow-hidden rounded-md border border-border/80 bg-surface/95 shadow-[0_1px_3px_rgba(34,31,23,0.12)] backdrop-blur-sm">
        <MapControlButton aria-label="Aumentar zoom" onClick={() => zoomBy(1)} disabled={!map}>
          <Plus className="h-3.5 w-3.5" weight="bold" />
        </MapControlButton>
        <div className="h-px bg-border" />
        <MapControlButton aria-label="Diminuir zoom" onClick={() => zoomBy(-1)} disabled={!map}>
          <Minus className="h-3.5 w-3.5" weight="bold" />
        </MapControlButton>
        {canFit && (
          <>
            <div className="h-px bg-border" />
            <MapControlButton aria-label="Enquadrar área" onClick={onFit} disabled={!map}>
              <ArrowsOut className="h-3.5 w-3.5" />
            </MapControlButton>
          </>
        )}
      </div>

      <div className="pointer-events-auto absolute bottom-2.5 left-2.5 flex overflow-hidden rounded-md border border-border/80 bg-surface/95 shadow-[0_1px_3px_rgba(34,31,23,0.12)] backdrop-blur-sm">
        {MAP_LAYERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onLayerChange(item.id)}
            className={cn(
              'px-2.5 py-1.5 text-[11px] font-medium tracking-wide transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ring',
              layer === item.id
                ? 'bg-accent text-accent-contrast'
                : 'text-text-secondary hover:bg-bg-subtle hover:text-text',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
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
  /**
   * Quando `false`, o ponto continua sincronizado via props/callbacks, mas os campos
   * de lat/lng ficam a cargo do formulário pai (ex.: coluna de dados da fazenda).
   */
  showPointFields?: boolean;
  /** Contorno auxiliar somente-leitura (ex.: a propriedade inteira, ao desenhar a área financiada). */
  referenceBoundary?: GeoPolygon | null;
  referenceLabel?: string;
  /** Câmera inicial quando ainda não há nada salvo pra enquadrar. */
  center?: LatLng | null;
  /** Número (px) ou qualquer valor CSS — use '100%' pra preencher um container flex. */
  height?: number | string;
  /**
   * Miniatura estática pra card/lista — sem barra de ferramentas, sem legenda embaixo,
   * sem zoom/pan/fullscreen. Só o mapa como visual, pra uma listagem com várias
   * propriedades não carregar N mapas totalmente interativos.
   */
  compact?: boolean;
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
  showPointFields = true,
  center,
  height,
  referenceBoundary,
  referenceLabel,
  compact = false,
  className,
}: LocationMapFieldProps) {
  const editable = !!onBoundaryChange;
  const pointEditable = onPointChange !== undefined;
  const inputId = useId();

  const apiLoaded = useApiIsLoaded();
  const geocodingLib = useMapsLibrary('geocoding');
  // Verde menta no satélite — contraste com vegetação, sem o tom amarelado do limão.
  const drawnColor = useThemeColor('--map-boundary', '#00f0a0');
  const drawnHalo = useThemeColor('--map-boundary-halo', '#0b1220');
  const referenceColor = useThemeColor('--map-reference', '#ffbf1a');
  const referenceHalo = useThemeColor('--map-reference-halo', '#0b1220');

  // Miniaturas: traço fino sem halo grosso pra não cobrir o contorno.
  const stroke = compact
    ? { drawn: 1.5, drawnHalo: 0, reference: 1.25, referenceHalo: 0, fill: 0.22, marker: 4 }
    : { drawn: 2.5, drawnHalo: 5, reference: 2, referenceHalo: 4, fill: 0.28, marker: 6 };

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>('hybrid');
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
  // `point` explícito (mesmo só pra leitura, sem onPointChange) sempre vence — é o que
  // permite mostrar um pino salvo pra uma propriedade que ainda não tem polígono desenhado.
  const displayedPoint = point !== undefined ? point : centroidPoint;

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
  /** Evita que o clique de remoção de vértice vire um clique de adição no mapa. */
  const suppressMapClick = useRef(false);

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

  // Clique num vértice remove o ponto (sem arrastar). Clique direito continua
  // fazendo o mesmo — a API nativa não oferece remoção sozinha.
  useEffect(() => {
    if (!polygonInstance || !editable) return;

    let moved = false;
    const ring = polygonInstance.getPath();

    const markMoved = () => {
      moved = true;
    };
    const onSetAt = ring.addListener('set_at', markMoved);
    const onInsertAt = ring.addListener('insert_at', markMoved);
    const onMouseDown = polygonInstance.addListener('mousedown', () => {
      moved = false;
    });

    function removeVertex(event: google.maps.PolyMouseEvent) {
      if (event.vertex === undefined) return;
      if (moved) return;
      suppressMapClick.current = true;
      const { path: currentPath, commitBoundary: commit } = latest.current;
      commit(currentPath.filter((_, index) => index !== event.vertex));
    }

    const onClick = polygonInstance.addListener('click', removeVertex);
    const onRightClick = polygonInstance.addListener('rightclick', removeVertex);

    return () => {
      onSetAt.remove();
      onInsertAt.remove();
      onMouseDown.remove();
      onClick.remove();
      onRightClick.remove();
    };
  }, [polygonInstance, editable]);

  function handleMapClick(event: MapMouseEvent) {
    if (suppressMapClick.current) {
      suppressMapClick.current = false;
      return;
    }
    if (!editable || !drawing || !event.detail.latLng) return;
    commitBoundary([...path, event.detail.latLng]);
  }

  function removePathVertex(index: number) {
    suppressMapClick.current = true;
    commitBoundary(path.filter((_, i) => i !== index));
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
    <div className={cn(!compact && 'space-y-2', height === '100%' && 'flex h-full min-h-0 flex-col', className)}>
      <div
        className={cn(
          'overflow-hidden',
          compact ? 'border-t border-border' : 'rounded-lg border border-border',
          height === '100%' && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        {editable && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-subtle px-3 py-2">
            <div className="relative min-w-[12rem] flex-1">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
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
              {searching ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <MagnifyingGlass className="h-3.5 w-3.5" />
              )}
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
                  <PenNib className="h-3.5 w-3.5" />
                  {drawing ? 'Desenhando' : 'Desenhar'}
                </>
              )}
            </Button>
          </div>
        )}

        <div
          style={{ height }}
          className={cn('relative', height === '100%' && 'min-h-0 flex-1')}
        >
          {!apiLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-bg-subtle text-xs text-text-tertiary">
              <CircleNotch className="h-4 w-4 animate-spin" />
              Carregando mapa...
            </div>
          )}
          <Map
            defaultCenter={initialCenter}
            defaultZoom={initialZoom}
            mapTypeId={mapLayer}
            gestureHandling={compact ? 'none' : 'greedy'}
            disableDefaultUI
            streetViewControl={false}
            fullscreenControl={false}
            mapTypeControl={false}
            zoomControl={false}
            scaleControl={false}
            rotateControl={false}
            keyboardShortcuts={!compact}
            clickableIcons={false}
            draggableCursor={editable && drawing ? 'crosshair' : undefined}
            onTilesLoaded={(event: MapEvent) => setMap(event.map)}
            onClick={handleMapClick}
          >
            {referencePath.length >= 3 && (
              <>
                {stroke.referenceHalo > 0 && (
                  <Polygon
                    paths={referencePath}
                    clickable={false}
                    strokeColor={referenceHalo}
                    strokeOpacity={0.85}
                    strokeWeight={stroke.referenceHalo}
                    fillOpacity={0}
                  />
                )}
                <Polygon
                  paths={referencePath}
                  clickable={false}
                  strokeColor={referenceColor}
                  strokeOpacity={1}
                  strokeWeight={stroke.reference}
                  fillOpacity={0}
                />
              </>
            )}

            {hasShape && (
              <>
                {stroke.drawnHalo > 0 && (
                  <Polygon
                    paths={path}
                    clickable={false}
                    strokeColor={drawnHalo}
                    strokeOpacity={0.9}
                    strokeWeight={stroke.drawnHalo}
                    fillOpacity={0}
                  />
                )}
                <Polygon
                  ref={setPolygonInstance}
                  paths={path}
                  editable={editable}
                  onPathsChanged={editable ? handlePathsChanged : undefined}
                  strokeColor={drawnColor}
                  strokeOpacity={1}
                  strokeWeight={stroke.drawn}
                  fillColor={drawnColor}
                  fillOpacity={stroke.fill}
                />
              </>
            )}

            {/* Traço parcial enquanto ainda não há vértices suficientes pra fechar a área. */}
            {!hasShape && path.length > 0 && (
              <>
                {stroke.drawnHalo > 0 && (
                  <Polyline
                    path={path}
                    strokeColor={drawnHalo}
                    strokeOpacity={0.9}
                    strokeWeight={stroke.drawnHalo}
                  />
                )}
                <Polyline
                  path={path}
                  strokeColor={drawnColor}
                  strokeOpacity={1}
                  strokeWeight={stroke.drawn}
                />
              </>
            )}

            {/* Vértices clicáveis no traço parcial (antes de fechar o polígono). */}
            {editable &&
              !hasShape &&
              path.map((vertex, index) => (
                <Marker
                  key={`vertex-${index}-${vertex.lat}-${vertex.lng}`}
                  position={vertex}
                  title="Clique para remover"
                  zIndex={10}
                  onClick={() => removePathVertex(index)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: drawnColor,
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                />
              ))}

            {apiLoaded && displayedPoint && (
              <Marker
                position={displayedPoint}
                clickable={false}
                title={pointLabel}
                zIndex={5}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: stroke.marker,
                  fillColor: drawnColor,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: compact ? 1.5 : 2,
                }}
              />
            )}
          </Map>

          {!compact && (
            <MapChrome
              map={map}
              layer={mapLayer}
              onLayerChange={setMapLayer}
              canFit={hasShape || referencePath.length >= 3}
              onFit={() => fitTo(hasShape ? path : referencePath)}
            />
          )}
        </div>
      </div>

      {!compact && (
        <>
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
                    className="inline-block h-2 w-3 shrink-0 rounded-sm border-2"
                    style={{ borderColor: referenceColor, backgroundColor: 'transparent' }}
                  />
                  {referenceLabel}
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
                  <ArrowUUpLeft className="h-3.5 w-3.5" />
                  Desfazer ponto
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => commitBoundary([])}>
                  <Trash className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              </div>
            )}
          </div>

          {pointEditable && showPointFields && (
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
        </>
      )}
    </div>
  );
}
