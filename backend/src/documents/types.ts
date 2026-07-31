/**
 * Shape agnóstico de Prisma consumido pelos geradores de documento (XLSX e PDF).
 * `mapper.ts` converte um projeto já persistido para isso — os geradores nunca
 * dependem de `id`/`createdAt` do Prisma diretamente.
 */
export interface ProjectDocumentItem {
  activityName: string;
  unit: string;
  areaHectares: string;
  productivity: string;
  unitPrice: string;
  costPerHectare: string;
  totalProduction: string;
  grossRevenue: string;
  totalCost: string;
  netProfit: string;
  productivityPerHectare: string | null;
  stockingRate: string | null;
}

export type DocumentSignatureType = 'AGRONOMIST' | 'PRODUCER';

export interface ProjectDocumentSignature {
  type: DocumentSignatureType;
  signatoryName: string;
  signatoryDocument: string;
  imageBase64: string | null;
  hash: string | null;
  signedAt: string | null;
}

export interface ProjectDocument {
  number: string;
  status: string;
  issuingCity: string;
  issueDate: string;
  notes: string | null;
  producer: { name: string; taxId: string; city: string; state: string };
  property: { name: string; registrationNumber: string; city: string; state: string; totalAreaHectares: string };
  season: { label: string };
  agronomist: { name: string; licenseNumber: string; issuingCity: string };
  items: ProjectDocumentItem[];
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
  profitMarginPercentage: string;
  approvedCreditLimit: string | null;
  bankNotes: string | null;
  signatures: ProjectDocumentSignature[];
}
