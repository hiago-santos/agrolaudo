-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGRONOMIST', 'BANK');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('GRAINS_FIBERS', 'PERMANENT_FRUIT', 'SEMI_PERMANENT', 'LIVESTOCK_PASTURE');

-- CreateEnum
CREATE TYPE "ProducerClassification" AS ENUM ('PRONAF', 'PRONAMP', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'UNDER_BANK_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('AGRONOMIST', 'PRODUCER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGRONOMIST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agronomists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "region" TEXT,
    "issuing_city" TEXT NOT NULL,
    "default_signature_base64" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agronomists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "default_unit" TEXT NOT NULL,
    "allowed_units" TEXT[],
    "is_livestock" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_quotes" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "cost_per_hectare" DECIMAL(18,4) NOT NULL,
    "region" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "classification" "ProducerClassification" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "total_area_hectares" DECIMAL(14,2) NOT NULL,
    "state_registration" TEXT,
    "rural_environmental_registry" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_sequences" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "producer_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "agronomist_id" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "issuing_city" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "total_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profit_margin_percentage" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "document_hash" TEXT,
    "approved_credit_limit" DECIMAL(18,2),
    "bank_notes" TEXT,
    "bank_reviewed_by_id" UUID,
    "bank_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "activity_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "area_hectares" DECIMAL(14,2) NOT NULL,
    "productivity" DECIMAL(14,2) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "cost_per_hectare" DECIMAL(18,4) NOT NULL,
    "herd_head_count" DECIMAL(14,2),
    "total_production" DECIMAL(18,2) NOT NULL,
    "gross_revenue" DECIMAL(18,2) NOT NULL,
    "total_cost" DECIMAL(18,2) NOT NULL,
    "net_profit" DECIMAL(18,2) NOT NULL,
    "productivity_per_hectare" DECIMAL(14,2),
    "stocking_rate" DECIMAL(14,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "SignatureType" NOT NULL,
    "signatory_name" TEXT NOT NULL,
    "signatory_document" TEXT NOT NULL,
    "image_base64" TEXT,
    "hash" TEXT,
    "signed_at" TIMESTAMP(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agronomists_user_id_key" ON "agronomists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agronomists_document_key" ON "agronomists"("document");

-- CreateIndex
CREATE UNIQUE INDEX "activities_slug_key" ON "activities"("slug");

-- CreateIndex
CREATE INDEX "price_quotes_activity_id_effective_from_idx" ON "price_quotes"("activity_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "producers_tax_id_key" ON "producers"("tax_id");

-- CreateIndex
CREATE INDEX "producers_name_idx" ON "producers"("name");

-- CreateIndex
CREATE INDEX "properties_producer_id_idx" ON "properties"("producer_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_producer_id_registration_number_key" ON "properties"("producer_id", "registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_label_key" ON "seasons"("label");

-- CreateIndex
CREATE UNIQUE INDEX "projects_number_key" ON "projects"("number");

-- CreateIndex
CREATE INDEX "projects_producer_id_idx" ON "projects"("producer_id");

-- CreateIndex
CREATE INDEX "projects_season_id_idx" ON "projects"("season_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_items_project_id_idx" ON "project_items"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_token_key" ON "signatures"("token");

-- CreateIndex
CREATE INDEX "signatures_project_id_idx" ON "signatures"("project_id");

-- AddForeignKey
ALTER TABLE "agronomists" ADD CONSTRAINT "agronomists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_quotes" ADD CONSTRAINT "price_quotes_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_agronomist_id_fkey" FOREIGN KEY ("agronomist_id") REFERENCES "agronomists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_bank_reviewed_by_id_fkey" FOREIGN KEY ("bank_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
