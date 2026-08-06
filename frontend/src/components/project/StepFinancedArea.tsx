import { Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PolygonMapField } from '@/components/map/PolygonMapField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { polygonAreaHectares } from '@/lib/geo';
import { projectsService } from '@/services/projects';
import { toast } from '@/stores/toast';
import type { ProjectDraft } from '@/types/projectDraft';

interface StepFinancedAreaProps {
  draft: ProjectDraft;
  onChange: (patch: Partial<ProjectDraft>) => void;
  onBack: () => void;
}

/**
 * Último passo do fluxo restrito do banco: desenhar, dentro da propriedade escolhida, a
 * área que está sendo pleiteada pro financiamento. O contorno da propriedade (se já
 * cadastrado) aparece como referência. Sem atividades — quem completa isso é o agrônomo.
 */
export function StepFinancedArea({ draft, onChange, onBack }: StepFinancedAreaProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const property = draft.property;
  const canSubmit =
    !!draft.producer &&
    !!property &&
    !!draft.season &&
    !!draft.agronomistId &&
    !!draft.financedAreaBoundary;

  async function submit() {
    if (
      !draft.producer ||
      !property ||
      !draft.season ||
      !draft.agronomistId ||
      !draft.financedAreaBoundary
    )
      return;
    setSubmitting(true);
    try {
      const created = await projectsService.initiate({
        producerId: draft.producer.id,
        propertyId: property.id,
        seasonId: draft.season.id,
        agronomistId: draft.agronomistId,
        financedAreaBoundary: draft.financedAreaBoundary,
        notes: draft.notes || undefined,
      });
      toast.success(
        `Projeto ${created.number} aberto.`,
        'O agrônomo responsável vai completar as atividades.',
      );
      navigate(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível abrir o projeto.');
    } finally {
      setSubmitting(false);
    }
  }

  const center =
    property?.latitude && property?.longitude
      ? { lat: Number(property.latitude), lng: Number(property.longitude) }
      : null;

  const financedHectares = useMemo(
    () => (draft.financedAreaBoundary ? polygonAreaHectares(draft.financedAreaBoundary) : null),
    [draft.financedAreaBoundary],
  );
  const totalHectares = property ? Number(property.totalAreaHectares) : 0;
  const financedShare =
    financedHectares !== null && totalHectares > 0
      ? (financedHectares / totalHectares) * 100
      : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-text">Área financiada</p>
        </div>
        <p className="text-xs text-text-secondary">
          Desenhe no mapa o pedaço de {property?.name ?? 'propriedade'} que está sendo pleiteado pro
          financiamento. O agrônomo responsável poderá ajustar essa área ao completar o projeto.
        </p>
        <PolygonMapField
          polygon={draft.financedAreaBoundary}
          onPolygonChange={(polygon) => onChange({ financedAreaBoundary: polygon })}
          center={center}
          referencePolygon={property?.boundary ?? null}
          referenceLabel="Contorno da propriedade"
          height="clamp(320px, 58vh, 620px)"
        />

        {financedHectares !== null && (
          <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-text">
            Financiando <span className="font-semibold">{formatNumber(financedHectares)} ha</span>{' '}
            de {formatNumber(totalHectares)} ha da propriedade
            {financedShare !== null && ` — ${formatNumber(financedShare)}% da área total`}.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Informações adicionais pro agrônomo que for completar o projeto..."
        />
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Voltar
        </Button>
        <Button onClick={() => void submit()} disabled={!canSubmit} loading={submitting}>
          Abrir projeto
        </Button>
      </div>
    </div>
  );
}
