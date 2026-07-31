import { ArrowLeft, MapPin, Pencil, Plus, Sprout } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ProducerFormDialog } from '@/components/producers/ProducerFormDialog';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatNumber } from '@/lib/format';
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

  if (loading) return <PageSpinner />;
  if (!producer) return null;

  return (
    <div className="space-y-6">
      <Link
        to="/producers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para produtores
      </Link>

      <PageHeader
        title={producer.name}
        description={`${producer.taxId} · ${producer.city}-${producer.state}`}
        actions={
          canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditProducerOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Classificação</p>
            <Badge tone="accent" className="mt-2">
              {CLASSIFICATION_LABEL[producer.classification]}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Contato</p>
            <p className="mt-1 text-sm text-text">{producer.phone || '—'}</p>
            <p className="text-sm text-text-secondary">{producer.email || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Propriedades</p>
            <p className="mt-1 text-2xl font-semibold text-text">{producer.properties.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold text-text">Propriedades</h2>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setNewPropertyOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova Propriedade
            </Button>
          )}
        </div>

        {producer.properties.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={MapPin}
              title="Nenhuma propriedade cadastrada"
              description="Cadastre a fazenda para começar a emitir projetos para este produtor."
            />
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {producer.properties.map((property) => (
              <div
                key={property.id}
                className="rounded-xl border border-border p-4 transition-colors hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{property.name}</p>
                    <p className="text-xs text-text-secondary">
                      Matrícula {property.registrationNumber} · {property.city}-{property.state}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingProperty(property)}
                      className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-bg-subtle hover:text-accent"
                      aria-label={`Editar ${property.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Área total: {formatNumber(property.totalAreaHectares)} ha
                </p>
                <Link
                  to={`/projects/new?producerId=${producer.id}&propertyId=${property.id}`}
                  className={buttonVariants('outline', 'sm') + ' mt-3 w-full'}
                >
                  <Sprout className="h-3.5 w-3.5" />
                  Emitir projeto
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

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
