import type { ProjectInput } from '@/services/projects';
import type { ProjectDraft } from '@/types/projectDraft';

/** Converte o rascunho do wizard no payload que a API espera. */
export function draftToProjectInput(draft: ProjectDraft): ProjectInput {
  if (!draft.producer || !draft.property || !draft.season || !draft.agronomistId) {
    throw new Error('Dados obrigatórios do projeto incompletos.');
  }

  const items = Object.values(draft.items)
    .filter((item) => item.selected)
    .map((item) => ({
      activityId: item.activity.id,
      unit: item.unit,
      areaHectares: Number(item.areaHectares || 0),
      productivity: Number(item.productivity || 0),
      unitPrice: Number(item.unitPrice || 0),
      costPerHectare: Number(item.costPerHectare || 0),
      herdHeadCount: item.activity.isLivestock ? Number(item.herdHeadCount || 0) : undefined,
    }));

  return {
    producerId: draft.producer.id,
    propertyId: draft.property.id,
    seasonId: draft.season.id,
    agronomistId: draft.agronomistId,
    issuingCity: draft.issuingCity || undefined,
    notes: draft.notes || undefined,
    items,
    ...(draft.financedAreaBoundary
      ? { financedAreaBoundary: draft.financedAreaBoundary }
      : {}),
  };
}
