import { Bank } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectAreaSelector } from '@/components/project/ProjectAreaSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
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
 * área que está sendo pleiteada pro financiamento. Sem atividades — quem completa isso é o agrônomo.
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

  if (!property) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <Bank className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-text">Área financiada</p>
      </div>

      <ProjectAreaSelector
        property={property}
        boundary={draft.financedAreaBoundary}
        onBoundaryChange={(financedAreaBoundary) => onChange({ financedAreaBoundary })}
        title="Área financiada"
        description={`Desenhe no mapa o pedaço de ${property.name} que está sendo pleiteado pro financiamento. O agrônomo responsável poderá ajustar essa área ao completar o projeto.`}
      />

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
