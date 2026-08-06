import { MapTrifold } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { LocationMapField } from '@/components/map/LocationMapField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatNumber } from '@/lib/format';
import { polygonAreaHectares, polygonCentroid } from '@/lib/geo';
import { propertiesService } from '@/services/properties';
import type { GeoPolygon, Property } from '@/types/domain';

interface ProjectAreaSelectorProps {
  property: Property;
  boundary: GeoPolygon | null;
  onBoundaryChange: (boundary: GeoPolygon | null) => void;
  onClose?: () => void;
  onPropertyLoaded?: (property: Property) => void;
  title?: string;
  description?: string;
}

/** Mapa para delimitar uma parte da propriedade como base do projeto. */
export function ProjectAreaSelector({
  property,
  boundary,
  onBoundaryChange,
  onClose,
  onPropertyLoaded,
  title = 'Parte da fazenda',
  description,
}: ProjectAreaSelectorProps) {
  const [resolvedProperty, setResolvedProperty] = useState(property);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const onPropertyLoadedRef = useRef(onPropertyLoaded);
  onPropertyLoadedRef.current = onPropertyLoaded;

  useEffect(() => {
    let cancelled = false;
    setLoadingProperty(true);
    void propertiesService
      .get(property.id)
      .then((loaded) => {
        if (cancelled) return;
        setResolvedProperty(loaded);
        onPropertyLoadedRef.current?.(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoadingProperty(false);
      });
    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const mapCenter = useMemo(() => {
    if (resolvedProperty.latitude && resolvedProperty.longitude) {
      return {
        lat: Number(resolvedProperty.latitude),
        lng: Number(resolvedProperty.longitude),
      };
    }
    if (resolvedProperty.boundary) {
      return polygonCentroid(resolvedProperty.boundary);
    }
    return null;
  }, [resolvedProperty]);

  const selectedHectares = useMemo(
    () => (boundary ? polygonAreaHectares(boundary) : null),
    [boundary],
  );
  const totalHectares = Number(resolvedProperty.totalAreaHectares);
  const selectedShare =
    selectedHectares !== null && totalHectares > 0
      ? (selectedHectares / totalHectares) * 100
      : null;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapTrifold className="h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="text-xs text-text-secondary">
              {description ??
                `Desenhe no mapa a área de ${resolvedProperty.name} que será base deste projeto.${
                  resolvedProperty.boundary
                    ? ' O contorno cadastrado da propriedade aparece como referência.'
                    : ' Cadastre o contorno da propriedade para ter uma referência visual.'
                }`}
            </p>
          </div>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {loadingProperty ? (
        <div
          className="flex items-center justify-center rounded-lg border border-border bg-bg-subtle"
          style={{ height: 'clamp(280px, 50vh, 520px)' }}
        >
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : (
        <LocationMapField
          key={resolvedProperty.id}
          boundary={boundary}
          onBoundaryChange={onBoundaryChange}
          center={mapCenter}
          point={mapCenter}
          pointLabel="Localização da propriedade"
          referenceBoundary={resolvedProperty.boundary ?? null}
          referenceLabel="Contorno da propriedade"
          height="clamp(280px, 50vh, 520px)"
        />
      )}

      {selectedHectares !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-text">
          <p>
            Área selecionada:{' '}
            <span className="font-semibold">{formatNumber(selectedHectares)} ha</span>
            {totalHectares > 0 && (
              <>
                {' '}
                de {formatNumber(totalHectares)} ha da propriedade
                {selectedShare !== null && ` — ${formatNumber(selectedShare)}%`}
              </>
            )}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onBoundaryChange(null)}
          >
            Limpar seleção
          </Button>
        </div>
      )}
    </Card>
  );
}
