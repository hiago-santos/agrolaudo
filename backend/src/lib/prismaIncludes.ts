import type { Prisma } from '@prisma/client';

/**
 * Formas de `include` reaproveitadas entre services — evita redefinir o mesmo
 * objeto de relações em vários lugares (e por acidente divergir entre eles).
 * Os tipos aqui são 100% derivados do Prisma (`Prisma.XGetPayload`), nunca
 * redigitados à mão — a fonte da verdade do shape continua sendo o schema.
 */

export const AGRONOMIST_WITH_USER_INCLUDE = {
  user: { select: { email: true, active: true } },
} satisfies Prisma.AgronomistInclude;

export const PRODUCER_WITH_PROPERTIES_INCLUDE = {
  properties: true,
} satisfies Prisma.ProducerInclude;

/** Shape completo — tela de detalhe do projeto e geração de documentos (PDF/XLSX). */
export const PROJECT_DETAIL_INCLUDE = {
  producer: true,
  property: true,
  season: true,
  agronomist: true,
  bankReviewer: { select: { id: true, name: true, email: true } },
  items: { orderBy: { order: 'asc' as const } },
  signatures: true,
} satisfies Prisma.ProjectInclude;

export type ProjectDetail = Prisma.ProjectGetPayload<{ include: typeof PROJECT_DETAIL_INCLUDE }>;

/** Shape leve — listagens (histórico, dashboard), sem itens/assinaturas completos. */
export const PROJECT_SUMMARY_INCLUDE = {
  producer: { select: { id: true, name: true, taxId: true } },
  property: { select: { id: true, name: true, registrationNumber: true } },
  season: { select: { id: true, label: true } },
  agronomist: { select: { id: true, name: true, licenseNumber: true } },
} satisfies Prisma.ProjectInclude;
