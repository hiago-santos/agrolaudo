import { Check, MapPin, Plus, Search, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ProducerFormDialog } from '@/components/producers/ProducerFormDialog';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { agronomistsService } from '@/services/agronomists';
import { producersService } from '@/services/producers';
import { seasonsService } from '@/services/seasons';
import { useAuthStore } from '@/stores/auth';
import type { Agronomist, Producer, Season } from '@/types/domain';
import type { ProjectDraft } from '@/types/projectDraft';
import { cn } from '@/lib/cn';

interface Step1Props {
  draft: ProjectDraft;
  onChange: (patch: Partial<ProjectDraft>) => void;
  onNext: () => void;
}

export function Step1ProducerSelection({ draft, onChange, onNext }: Step1Props) {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Producer[]>([]);
  const [searching, setSearching] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [agronomists, setAgronomists] = useState<Agronomist[]>([]);
  const [newProducerOpen, setNewProducerOpen] = useState(false);
  const [newPropertyOpen, setNewPropertyOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listboxId = 'producer-search-results';
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    void seasonsService.list().then((list) => {
      setSeasons(list);
      const active = list.find((s) => s.active);
      if (active && !draft.season) onChange({ season: active });
    });
    if (user?.role === 'ADMIN') {
      void agronomistsService.list().then(setAgronomists);
    } else if (user?.agronomist) {
      onChange({ agronomistId: user.agronomist.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      producersService
        .list({ search, pageSize: 8 })
        .then((r) => {
          setResults(r.items);
          setHighlighted(0);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  function selectProducer(producer: Producer) {
    onChange({
      producer,
      property: producer.properties.length === 1 ? producer.properties[0] : null,
    });
    setSearch('');
    setResults([]);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const next = (highlighted + offset + results.length) % results.length;
      setHighlighted(next);
      optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter') {
      const producer = results[highlighted];
      if (producer) {
        event.preventDefault();
        selectProducer(producer);
      }
      return;
    }

    if (event.key === 'Escape') {
      setResults([]);
      setSearch('');
    }
  }

  const canAdvance = !!draft.producer && !!draft.property && !!draft.season && !!draft.agronomistId;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label>Produtor</Label>
        {draft.producer ? (
          <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-text">{draft.producer.name}</p>
                <p className="text-xs text-text-secondary">{draft.producer.taxId}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onChange({ producer: null, property: null })}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Buscar por nome ou CPF/CNPJ..."
                className="pl-9"
                role="combobox"
                aria-expanded={!!search}
                aria-controls={listboxId}
                aria-autocomplete="list"
              />
            </div>
            {search && (
              <div
                id={listboxId}
                role="listbox"
                className="animate-menu-in overflow-hidden rounded-md border border-border bg-surface"
              >
                {searching && (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                )}
                {!searching && results.length === 0 && (
                  <p className="p-3 text-xs text-text-secondary">Nenhum produtor encontrado.</p>
                )}
                {!searching &&
                  results.map((producer, index) => (
                    <button
                      key={producer.id}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={index === highlighted}
                      onClick={() => selectProducer(producer)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0',
                        index === highlighted ? 'bg-accent-soft text-accent' : 'hover:bg-bg-subtle',
                      )}
                    >
                      <span className="truncate font-medium text-text">{producer.name}</span>
                      <span className="shrink-0 font-mono text-xs text-text-secondary">{producer.taxId}</span>
                    </button>
                  ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setNewProducerOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Criar novo produtor
            </Button>
          </div>
        )}
      </Card>

      {draft.producer && (
        <Card className="p-5">
          <Label>Propriedade</Label>
          <div className="space-y-2">
            {draft.producer.properties.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => onChange({ property })}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                  draft.property?.id === property.id
                    ? 'border-accent/30 bg-accent-soft'
                    : 'border-border hover:bg-bg-subtle',
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-text-tertiary" />
                  <div>
                    <p className="text-sm font-medium text-text">{property.name}</p>
                    <p className="text-xs text-text-secondary">
                      Matrícula {property.registrationNumber} · {property.city}-{property.state}
                    </p>
                  </div>
                </div>
                {draft.property?.id === property.id && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setNewPropertyOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova propriedade
            </Button>
          </div>
        </Card>
      )}

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="season">Safra de referência</Label>
          <Select
            id="season"
            value={draft.season?.id ?? ''}
            onChange={(next) => onChange({ season: seasons.find((s) => s.id === next) ?? null })}
            placeholder="Selecione a safra"
            options={seasons.map((season) => ({
              value: season.id,
              label: season.label,
            }))}
          />
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <Label htmlFor="agronomist">Engenheiro Agrônomo responsável</Label>
            <Select
              id="agronomist"
              value={draft.agronomistId ?? ''}
              onChange={(next) => onChange({ agronomistId: next || null })}
              placeholder="Selecione o agrônomo"
              options={agronomists.map((agronomist) => ({
                value: agronomist.id,
                label: `${agronomist.name} — ${agronomist.licenseNumber}`,
                searchLabel: `${agronomist.name} ${agronomist.licenseNumber}`,
              }))}
            />
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canAdvance}>
          Próximo: Atividades
        </Button>
      </div>

      <ProducerFormDialog
        open={newProducerOpen}
        onClose={() => setNewProducerOpen(false)}
        onSaved={(producer) => selectProducer(producer)}
      />
      {draft.producer &&
        (() => {
          const producer = draft.producer;
          return (
            <PropertyFormDialog
              open={newPropertyOpen}
              onClose={() => setNewPropertyOpen(false)}
              producerId={producer.id}
              onSaved={(property) =>
                onChange({
                  producer: { ...producer, properties: [...producer.properties, property] },
                  property,
                })
              }
            />
          );
        })()}
    </div>
  );
}
