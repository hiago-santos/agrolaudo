import type { Prisma, PrismaClient, ProjectStatus } from '@prisma/client';

import { consolidate } from '../core/calculator.js';
import {
  PROJECT_DETAIL_INCLUDE,
  PROJECT_SUMMARY_INCLUDE,
  type ProjectDetail,
} from '../lib/prismaIncludes.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

import { calculateProjectItems, type ProjectItemInput } from './calculation.service.js';
import { nextProjectNumber } from './numbering.service.js';

/**
 * O default do Prisma (5s) é apertado demais para "upsert de sequência + create
 * com N itens aninhados" quando o Postgres é remoto (Railway, não localhost) —
 * cada round-trip da transação soma latência de rede, não só tempo de query.
 */
const TRANSACTION_OPTIONS = { timeout: 15_000 };

export interface CreateProjectInput {
  producerId: string;
  propertyId: string;
  seasonId: string;
  agronomistId: string;
  issuingCity?: string;
  notes?: string;
  items: ProjectItemInput[];
}

export interface UpdateProjectInput {
  issuingCity?: string;
  notes?: string;
  items?: ProjectItemInput[];
}

export interface ListProjectsFilters {
  search?: string;
  producerId?: string;
  seasonId?: string;
  agronomistId?: string;
  status?: ProjectStatus;
  page: number;
  pageSize: number;
}

function itemsToCreateInput(
  calculatedItems: Awaited<ReturnType<typeof calculateProjectItems>>,
): Prisma.ProjectItemCreateWithoutProjectInput[] {
  return calculatedItems.map(({ activity, unit, input, result }, order) => ({
    activity: { connect: { id: activity.id } },
    activityName: activity.name,
    unit,
    areaHectares: input.areaHectares,
    productivity: input.productivity,
    unitPrice: input.unitPrice,
    costPerHectare: input.costPerHectare,
    herdHeadCount: input.herdHeadCount ?? null,
    totalProduction: result.totalProduction,
    grossRevenue: result.grossRevenue,
    totalCost: result.totalCost,
    netProfit: result.netProfit,
    productivityPerHectare: result.productivityPerHectare,
    stockingRate: result.stockingRate,
    order,
  }));
}

export async function listProjects(prisma: PrismaClient, filters: ListProjectsFilters) {
  const where: Prisma.ProjectWhereInput = {
    ...(filters.producerId && { producerId: filters.producerId }),
    ...(filters.seasonId && { seasonId: filters.seasonId }),
    ...(filters.agronomistId && { agronomistId: filters.agronomistId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.search && {
      OR: [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { producer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { producer: { taxId: { contains: filters.search } } },
        { property: { name: { contains: filters.search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: PROJECT_SUMMARY_INCLUDE,
    }),
    prisma.project.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getProject(prisma: PrismaClient, id: string): Promise<ProjectDetail> {
  const project = await prisma.project.findUnique({ where: { id }, include: PROJECT_DETAIL_INCLUDE });
  if (!project) throw new NotFoundError('Projeto');
  return project;
}

/** Alimenta a revisão ao vivo no formulário — calcula sem persistir nada. */
export async function calculateProject(prisma: PrismaClient, itemsInput: ProjectItemInput[]) {
  const items = await calculateProjectItems(prisma, itemsInput);
  const consolidated = consolidate(items.map((item) => item.result));

  return {
    items: items.map(({ activity, unit, result }) => ({
      activityId: activity.id,
      activityName: activity.name,
      unit,
      ...result,
    })),
    consolidated,
  };
}

async function validateReferences(
  prisma: PrismaClient,
  input: Pick<CreateProjectInput, 'producerId' | 'propertyId' | 'seasonId' | 'agronomistId'>,
) {
  const [producer, property, season, agronomist] = await Promise.all([
    prisma.producer.findUnique({ where: { id: input.producerId } }),
    prisma.property.findUnique({ where: { id: input.propertyId } }),
    prisma.season.findUnique({ where: { id: input.seasonId } }),
    prisma.agronomist.findUnique({ where: { id: input.agronomistId } }),
  ]);
  if (!producer) throw new NotFoundError('Produtor');
  if (!property) throw new NotFoundError('Propriedade');
  if (property.producerId !== producer.id) {
    throw new ValidationError('Essa propriedade não pertence ao produtor informado.');
  }
  if (!season) throw new NotFoundError('Safra');
  if (!agronomist) throw new NotFoundError('Agrônomo');
  return { producer, property, season, agronomist };
}

export async function createProject(prisma: PrismaClient, input: CreateProjectInput) {
  const { property, season, agronomist } = await validateReferences(prisma, input);

  const calculatedItems = await calculateProjectItems(prisma, input.items);
  const consolidated = consolidate(calculatedItems.map((item) => item.result));

  return prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const number = await nextProjectNumber(tx, year);

    return tx.project.create({
      data: {
        number,
        producer: { connect: { id: property.producerId } },
        property: { connect: { id: property.id } },
        season: { connect: { id: season.id } },
        agronomist: { connect: { id: agronomist.id } },
        status: 'DRAFT',
        issuingCity: input.issuingCity ?? agronomist.issuingCity,
        notes: input.notes,
        totalRevenue: consolidated.totalRevenue,
        totalCost: consolidated.totalCost,
        totalProfit: consolidated.totalProfit,
        profitMarginPercentage: consolidated.profitMarginPercentage,
        items: { create: itemsToCreateInput(calculatedItems) },
      },
      include: PROJECT_DETAIL_INCLUDE,
    });
  }, TRANSACTION_OPTIONS);
}

export async function updateProject(prisma: PrismaClient, id: string, input: UpdateProjectInput) {
  const project = await getProject(prisma, id);
  if (project.status !== 'DRAFT') {
    throw new ConflictError(
      'Só é possível editar projetos em rascunho. Para corrigir um projeto já assinado, duplique-o.',
    );
  }

  if (!input.items) {
    return prisma.project.update({
      where: { id },
      data: { issuingCity: input.issuingCity, notes: input.notes },
      include: PROJECT_DETAIL_INCLUDE,
    });
  }

  const calculatedItems = await calculateProjectItems(prisma, input.items);
  const consolidated = consolidate(calculatedItems.map((item) => item.result));

  return prisma.$transaction(async (tx) => {
    await tx.projectItem.deleteMany({ where: { projectId: id } });
    return tx.project.update({
      where: { id },
      data: {
        issuingCity: input.issuingCity,
        notes: input.notes,
        totalRevenue: consolidated.totalRevenue,
        totalCost: consolidated.totalCost,
        totalProfit: consolidated.totalProfit,
        profitMarginPercentage: consolidated.profitMarginPercentage,
        items: { create: itemsToCreateInput(calculatedItems) },
      },
      include: PROJECT_DETAIL_INCLUDE,
    });
  }, TRANSACTION_OPTIONS);
}

const NON_TERMINAL_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'PENDING_SIGNATURES',
  'SIGNED',
  'UNDER_BANK_REVIEW',
];

export async function cancelProject(prisma: PrismaClient, id: string) {
  const project = await getProject(prisma, id);
  if (!NON_TERMINAL_STATUSES.includes(project.status)) {
    throw new ConflictError('Este projeto já está em um estado final e não pode mais ser cancelado.');
  }
  return prisma.project.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: PROJECT_DETAIL_INCLUDE,
  });
}

/**
 * Envia o projeto assinado pro banco analisar — transição explícita (não
 * automática) de SIGNED para UNDER_BANK_REVIEW.
 */
export async function submitProjectForReview(prisma: PrismaClient, id: string) {
  const project = await getProject(prisma, id);
  if (project.status !== 'SIGNED') {
    throw new ConflictError('Só é possível enviar pro banco um projeto já assinado pelas duas partes.');
  }
  return prisma.project.update({
    where: { id },
    data: { status: 'UNDER_BANK_REVIEW' },
    include: PROJECT_DETAIL_INCLUDE,
  });
}

/**
 * Duplica para a próxima safra: mantém área/produtividade/rebanho (o que tende a
 * repetir de uma safra para outra) mas repuxa preço/custo ATUAIS da matriz — não
 * faz sentido reemitir com uma cotação de meses atrás. O novo projeto volta pro
 * início do fluxo (DRAFT).
 */
export async function duplicateProject(prisma: PrismaClient, id: string, newSeasonId: string) {
  const original = await getProject(prisma, id);
  const newSeason = await prisma.season.findUnique({ where: { id: newSeasonId } });
  if (!newSeason) throw new NotFoundError('Safra');

  const itemsInput: ProjectItemInput[] = await Promise.all(
    original.items.map(async (item) => {
      const currentQuote = await prisma.priceQuote.findFirst({
        where: { activityId: item.activityId },
        orderBy: { effectiveFrom: 'desc' },
      });
      return {
        activityId: item.activityId,
        unit: item.unit,
        areaHectares: Number(item.areaHectares),
        productivity: Number(item.productivity),
        unitPrice: currentQuote ? Number(currentQuote.unitPrice) : Number(item.unitPrice),
        costPerHectare: currentQuote ? Number(currentQuote.costPerHectare) : Number(item.costPerHectare),
        herdHeadCount: item.herdHeadCount ? Number(item.herdHeadCount) : undefined,
      };
    }),
  );

  return createProject(prisma, {
    producerId: original.producerId,
    propertyId: original.propertyId,
    seasonId: newSeasonId,
    agronomistId: original.agronomistId,
    issuingCity: original.issuingCity,
    notes: original.notes ?? undefined,
    items: itemsInput,
  });
}
