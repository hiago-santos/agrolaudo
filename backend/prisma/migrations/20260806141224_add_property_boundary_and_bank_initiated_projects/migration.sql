-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'BANK_INITIATED';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "financed_area_boundary" JSONB,
ADD COLUMN     "financed_area_hectares" DECIMAL(14,2),
ADD COLUMN     "initiated_by_id" UUID;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "boundary_area_hectares" DECIMAL(14,2),
ADD COLUMN     "boundary_geojson" JSONB;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
