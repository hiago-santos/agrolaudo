import {
  ArrowLeft,
  EnvelopeSimple,
  MapPin,
  Pencil,
  Phone,
  Plus,
} from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { LocationMapField } from '@/components/map/LocationMapField';
import { ProducerFormDialog } from '@/components/producers/ProducerFormDialog';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCards, SkeletonPageHeader, SkeletonText } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatNumber, formatPhone } from '@/lib/format';
import { producersService } from '@/services/producers';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Producer, Property } from '@/types/domain';

const CLASSIFICATION_LABEL: Record<string, string> = {
  PRONAF: 'PRONAF',
  PRONAMP: 'PRONAMP',
  OTHER: 'Demais',
};

export function ProducerDetail() {
  const { id } = useParams<{ id: string }>();
  const [producer, setProducer] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editProducerOpen, setEditProducerOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newPropertyOpen, setNewPropertyOpen] = useState(false);
  const canEdit = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST'));

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setProducer(await producersService.get(id));
    } catch {
      toast.error('Não foi possível carregar o produtor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonPageHeader />
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <SkeletonText lines={4} />
        </div>
        <SkeletonCards count={2} className="sm:grid-cols-2" />
      </div>
    );
  }
  if (!producer) return null;

  const totalAreaHa = producer.properties.reduce(
    (sum, property) => sum + Number(property.totalAreaHectares || 0),
    0,
  );

  return (
    <div className="space-y-8">
      <Link
        to="/producers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para produtores
      </Link>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_3px_rgba(34,31,23,0.05)]">
        <div className="border-b border-border bg-[linear-gradient(135deg,var(--accent-soft)_0%,transparent_55%)] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">
                  {producer.name}
                </h1>
                <Badge tone="accent">{CLASSIFICATION_LABEL[producer.classification]}</Badge>
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  {producer.city}-{producer.state}
                </span>
                <span className="text-text-tertiary" aria-hidden>
                  ·
                </span>
                <span className="font-mono text-[13px] tabular-nums text-text">
                  {producer.taxId}
                </span>
              </p>
            </div>

            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditProducerOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <DataCell
            label="Telefone"
            value={formatPhone(producer.phone)}
            icon={<Phone className="h-3.5 w-3.5" />}
          />
          <DataCell
            label="E-mail"
            value={producer.email || '—'}
            icon={<EnvelopeSimple className="h-3.5 w-3.5" />}
            truncate
          />
          <DataCell
            label="Propriedades"
            value={
              producer.properties.length === 0
                ? 'Nenhuma'
                : `${producer.properties.length} cadastrada${producer.properties.length === 1 ? '' : 's'}`
            }
          />
          <DataCell
            label="Área total"
            value={producer.properties.length === 0 ? '—' : `${formatNumber(totalAreaHa)} ha`}
            emphasize
          />
          {producer.address && (
            <DataCell
              label="Endereço"
              value={producer.address}
              className="sm:col-span-2 lg:col-span-4"
            />
          )}
        </dl>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-text">
              Propriedades
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              Fazendas e matrículas vinculadas a este produtor.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setNewPropertyOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova propriedade
            </Button>
          )}
        </div>

        {producer.properties.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-bg-subtle/60 p-6">
            <EmptyState
              icon={MapPin}
              title="Nenhuma propriedade cadastrada"
              description="Cadastre a fazenda para começar a emitir projetos para este produtor."
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {producer.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                canEdit={canEdit}
                onEdit={() => setEditingProperty(property)}
              />
            ))}
          </div>
        )}
      </section>

      <ProducerFormDialog
        open={editProducerOpen}
        onClose={() => setEditProducerOpen(false)}
        producer={producer}
        onSaved={() => void load()}
      />

      <PropertyFormDialog
        open={newPropertyOpen}
        onClose={() => setNewPropertyOpen(false)}
        producerId={producer.id}
        onSaved={() => void load()}
      />

      <PropertyFormDialog
        open={!!editingProperty}
        onClose={() => setEditingProperty(null)}
        producerId={producer.id}
        property={editingProperty}
        onSaved={() => void load()}
      />
    </div>
  );
}

function DataCell({
  label,
  value,
  icon,
  emphasize,
  truncate,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  emphasize?: boolean;
  truncate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('bg-surface px-5 py-4 sm:px-6', className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1.5 flex items-center gap-1.5 text-sm text-text',
          emphasize && 'font-display text-base font-semibold tracking-tight',
          truncate && 'min-w-0',
        )}
      >
        {icon && <span className="shrink-0 text-text-tertiary">{icon}</span>}
        <span className={cn(truncate && 'truncate')}>{value}</span>
      </dd>
    </div>
  );
}

interface PropertyCardProps {
  property: Property;
  canEdit: boolean;
  onEdit: () => void;
}

/** Card híbrido: dados da matrícula no topo, prévia do mapa preenchendo o restante. */
function PropertyCard({ property, canEdit, onEdit }: PropertyCardProps) {
  const point =
    property.latitude && property.longitude
      ? { lat: Number(property.latitude), lng: Number(property.longitude) }
      : null;
  const hasLocation = !!property.boundary || !!point;

  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_3px_rgba(34,31,23,0.05)] transition-colors hover:border-accent/40">
      <div className="shrink-0 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight text-text">
              {property.name}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Matrícula {property.registrationNumber} · {property.city}-{property.state}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              aria-label={`Editar ${property.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          <span className="font-medium text-text">
            {formatNumber(property.totalAreaHectares)} ha
          </span>
          {property.boundaryAreaHectares && (
            <> · demarcada: {formatNumber(property.boundaryAreaHectares)} ha</>
          )}
        </p>
      </div>

      {hasLocation ? (
        <LocationMapField
          boundary={property.boundary}
          point={point}
          height="100%"
          compact
          className="min-h-[180px] flex-1"
        />
      ) : (
        <div className="flex min-h-[160px] flex-1 items-center justify-center gap-1.5 border-t border-border bg-bg-subtle text-xs text-text-tertiary">
          <MapPin className="h-3.5 w-3.5" />
          Sem localização cadastrada
        </div>
      )}
    </div>
  );
}
