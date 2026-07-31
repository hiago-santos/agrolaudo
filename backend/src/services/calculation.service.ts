import type { Activity, PrismaClient } from '@prisma/client';

import { calculateItem, type CalculationItemResult } from '../core/calculator.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export interface ProjectItemInput {
  activityId: string;
  unit?: string;
  areaHectares: number;
  productivity: number;
  unitPrice: number;
  costPerHectare: number;
  herdHeadCount?: number;
}

export interface ProjectItemCalculated {
  activity: Activity;
  unit: string;
  input: ProjectItemInput;
  result: CalculationItemResult;
}

/**
 * Valida cada item contra o catálogo de atividades (existe? a unidade escolhida é
 * permitida para ela?) e roda o motor puro (core.calculateItem) — usado tanto pelo
 * preview (`/projects/calculate`) quanto pela persistência (`createProject`), então
 * os dois caminhos NUNCA podem calcular números diferentes para o mesmo input.
 */
export async function calculateProjectItems(
  prisma: PrismaClient,
  itemsInput: ProjectItemInput[],
): Promise<ProjectItemCalculated[]> {
  if (itemsInput.length === 0) {
    throw new ValidationError('O projeto precisa de pelo menos uma atividade.');
  }

  const activities = await prisma.activity.findMany({
    where: { id: { in: itemsInput.map((item) => item.activityId) } },
  });
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));

  return itemsInput.map((input) => {
    const activity = activityById.get(input.activityId);
    if (!activity) throw new NotFoundError(`Atividade ${input.activityId}`);

    const unit = input.unit ?? activity.defaultUnit;
    if (!activity.allowedUnits.includes(unit)) {
      throw new ValidationError(`Unidade "${unit}" não é válida para ${activity.name}.`);
    }

    const result = calculateItem({
      areaHectares: input.areaHectares,
      productivity: input.productivity,
      unitPrice: input.unitPrice,
      costPerHectare: input.costPerHectare,
      herdHeadCount: activity.isLivestock ? (input.herdHeadCount ?? null) : null,
    });

    return { activity, unit, input, result };
  });
}
