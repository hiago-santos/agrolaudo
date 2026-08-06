-- CreateEnum
CREATE TYPE "ProjectAttachmentSide" AS ENUM ('PRODUCER', 'BANK');

-- CreateTable
CREATE TABLE "project_attachments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "side" "ProjectAttachmentSide" NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_attachments_object_key_key" ON "project_attachments"("object_key");

-- CreateIndex
CREATE INDEX "project_attachments_project_id_idx" ON "project_attachments"("project_id");

-- CreateIndex
CREATE INDEX "project_attachments_project_id_side_idx" ON "project_attachments"("project_id", "side");

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
