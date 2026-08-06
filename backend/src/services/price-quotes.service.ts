import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';

import { NotFoundError, ValidationError } from '../lib/errors.js';

import type { priceQuoteItemInputSchema } from '../schemas/price-quotes.schemas.js';
import type { z } from 'zod';

type PriceQuoteItemInput = z.infer<typeof priceQuoteItemInputSchema>;

/**
 * Matriz atual = última PriceQuote (maior effectiveFrom) por atividade. O
 * histórico completo nunca é sobrescrito — PriceQuote é append-only.
 */
export async function getCurrentPriceMatrix(prisma: PrismaClient) {
  const activities = await prisma.activity.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  });

  const quotes = await prisma.priceQuote.findMany({
    where: { activityId: { in: activities.map((a) => a.id) } },
    orderBy: { effectiveFrom: 'desc' },
  });

  const latestByActivity = new Map<string, (typeof quotes)[number]>();
  for (const quote of quotes) {
    if (!latestByActivity.has(quote.activityId)) {
      latestByActivity.set(quote.activityId, quote);
    }
  }

  return activities.map((activity) => ({
    activity,
    currentQuote: latestByActivity.get(activity.id) ?? null,
  }));
}

export async function getActivityPriceHistory(prisma: PrismaClient, activityId: string) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new NotFoundError('Atividade');

  const history = await prisma.priceQuote.findMany({
    where: { activityId },
    orderBy: { effectiveFrom: 'desc' },
  });

  return { activity, history };
}

/** "[Salvar Novas Cotações]" — insere uma nova linha por atividade (nunca sobrescreve). */
export async function updatePriceQuotes(
  prisma: PrismaClient,
  items: PriceQuoteItemInput[],
  createdById?: string,
) {
  const activities = await prisma.activity.findMany({
    where: { id: { in: items.map((item) => item.activityId) } },
  });
  const activityById = new Map(activities.map((a) => [a.id, a]));

  for (const item of items) {
    const activity = activityById.get(item.activityId);
    if (!activity) throw new NotFoundError(`Atividade ${item.activityId}`);
    if (!activity.allowedUnits.includes(item.unit)) {
      throw new ValidationError(`Unidade "${item.unit}" não é válida para ${activity.name}.`);
    }
  }

  return prisma.$transaction(
    items.map((item) =>
      prisma.priceQuote.create({
        data: {
          activityId: item.activityId,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPerHectare: item.costPerHectare,
          region: item.region,
          createdById,
        },
      }),
    ),
  );
}

const EXPORT_COLUMNS = [
  { header: 'Slug', key: 'slug', width: 30 },
  { header: 'Atividade', key: 'name', width: 32 },
  { header: 'Unidade', key: 'unit', width: 16 },
  { header: 'Preço Unitário (R$)', key: 'price', width: 20 },
  { header: 'Custo/ha (R$)', key: 'cost', width: 18 },
] as const;

export async function exportPriceMatrixXlsx(prisma: PrismaClient): Promise<Buffer> {
  const matrix = await getCurrentPriceMatrix(prisma);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Matriz de Preços');
  sheet.columns = [...EXPORT_COLUMNS];
  sheet.getRow(1).font = { bold: true };

  for (const { activity, currentQuote } of matrix) {
    sheet.addRow({
      slug: activity.slug,
      name: activity.name,
      unit: currentQuote?.unit ?? activity.defaultUnit,
      price: currentQuote ? Number(currentQuote.unitPrice) : 0,
      cost: currentQuote ? Number(currentQuote.costPerHectare) : 0,
    });
  }

  sheet.getColumn('price').numFmt = '"R$" #,##0.00';
  sheet.getColumn('cost').numFmt = '"R$" #,##0.00';

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface ImportResult {
  updated: number;
  skipped: string[];
}

/** Reimporta a planilha baixada em /price-quotes/export.xlsx — casa pela coluna Slug. */
export async function importPriceMatrixXlsx(
  prisma: PrismaClient,
  buffer: Buffer,
  createdById?: string,
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  // O `.d.ts` do ExcelJS declara um `Buffer` próprio (local ao módulo, `extends
  // ArrayBuffer`) que colide estruturalmente com o Buffer genérico do @types/node
  // atual. `as never` só contorna essa checagem de tipos — em runtime é o mesmo
  // Buffer do Node dos dois lados.
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ValidationError('Planilha vazia ou em formato inesperado.');

  const activities = await prisma.activity.findMany();
  const activityBySlug = new Map(activities.map((a) => [a.slug, a]));

  const validRows: Array<{
    activityId: string;
    unit: string;
    unitPrice: number;
    costPerHectare: number;
  }> = [];
  const skipped: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho

    const slug = String(row.getCell(1).value ?? '').trim();
    const unit = String(row.getCell(3).value ?? '').trim();
    const price = Number(row.getCell(4).value);
    const cost = Number(row.getCell(5).value);

    const activity = activityBySlug.get(slug);
    const validRow = activity && unit && Number.isFinite(price) && Number.isFinite(cost);

    if (!validRow) {
      skipped.push(`linha ${rowNumber}`);
      return;
    }

    validRows.push({ activityId: activity.id, unit, unitPrice: price, costPerHectare: cost });
  });

  if (validRows.length > 0) {
    await prisma.$transaction(
      validRows.map((row) => prisma.priceQuote.create({ data: { ...row, createdById } })),
    );
  }

  return { updated: validRows.length, skipped };
}
