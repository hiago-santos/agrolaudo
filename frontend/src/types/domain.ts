export type UserRole = 'ADMIN' | 'AGRONOMIST' | 'BANK';
export type ProducerClassification = 'PRONAF' | 'PRONAMP' | 'OTHER';
export type ActivityCategory =
  | 'GRAINS_FIBERS'
  | 'PERMANENT_FRUIT'
  | 'SEMI_PERMANENT'
  | 'LIVESTOCK_PASTURE';
export type ProjectStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURES'
  | 'SIGNED'
  | 'UNDER_BANK_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';
export type SignatureType = 'AGRONOMIST' | 'PRODUCER';

export interface Agronomist {
  id: string;
  name: string;
  document: string;
  licenseNumber: string;
  region: string | null;
  issuingCity: string;
  defaultSignatureBase64: string | null;
  user?: { email: string; active: boolean };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agronomist: Agronomist | null;
}

export interface Producer {
  id: string;
  name: string;
  taxId: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string;
  state: string;
  classification: ProducerClassification;
  properties: Property[];
}

export interface Property {
  id: string;
  producerId: string;
  name: string;
  registrationNumber: string;
  city: string;
  state: string;
  totalAreaHectares: string;
  stateRegistration: string | null;
  ruralEnvironmentalRegistry: string | null;
  latitude: string | null;
  longitude: string | null;
  producer?: { id: string; name: string; taxId: string };
}

export interface Activity {
  id: string;
  slug: string;
  name: string;
  category: ActivityCategory;
  defaultUnit: string;
  allowedUnits: string[];
  isLivestock: boolean;
  active: boolean;
  order: number;
}

export interface PriceQuote {
  id: string;
  activityId: string;
  unit: string;
  unitPrice: string;
  costPerHectare: string;
  region: string | null;
  effectiveFrom: string;
}

export interface PriceMatrixItem {
  activity: Activity;
  currentQuote: PriceQuote | null;
}

export interface Season {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface ProjectItem {
  id: string;
  activityId: string;
  activityName: string;
  unit: string;
  areaHectares: string;
  productivity: string;
  unitPrice: string;
  costPerHectare: string;
  herdHeadCount: string | null;
  totalProduction: string;
  grossRevenue: string;
  totalCost: string;
  netProfit: string;
  productivityPerHectare: string | null;
  stockingRate: string | null;
  order: number;
}

export interface Signature {
  id: string;
  type: SignatureType;
  signatoryName: string;
  signatoryDocument: string;
  imageBase64: string | null;
  hash: string | null;
  signedAt: string | null;
  token?: string | null;
}

export interface ProjectSummary {
  id: string;
  number: string;
  status: ProjectStatus;
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
  profitMarginPercentage: string;
  createdAt: string;
  producer: { id: string; name: string; taxId: string };
  property: { id: string; name: string; registrationNumber: string };
  season: { id: string; label: string };
  agronomist: { id: string; name: string; licenseNumber: string };
}

export interface Project extends ProjectSummary {
  issuingCity: string;
  issueDate: string;
  notes: string | null;
  documentHash: string | null;
  approvedCreditLimit: string | null;
  bankNotes: string | null;
  bankReviewedAt: string | null;
  bankReviewer: { id: string; name: string; email: string } | null;
  items: ProjectItem[];
  signatures: Signature[];
}

export interface CalculatedProjectItem {
  activityId: string;
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

export interface ConsolidatedCalculation {
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
  profitMarginPercentage: string;
}

export interface ProjectCalculationResult {
  items: CalculatedProjectItem[];
  consolidated: ConsolidatedCalculation;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  projectsThisMonth: number;
  pendingSignaturesCount: number;
  underBankReviewCount: number;
  activeProducersCount: number;
  revenueThisMonth: string;
  profitThisMonth: string;
  recentProjects: Array<{
    id: string;
    number: string;
    status: ProjectStatus;
    totalRevenue: string;
    createdAt: string;
    producer: { name: string };
    property: { name: string };
  }>;
}
