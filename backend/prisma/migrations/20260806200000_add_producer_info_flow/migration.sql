-- CreateEnum
CREATE TYPE "ProjectMessageKind" AS ENUM ('BANK_REQUEST', 'PRODUCER_REPLY');

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'AWAITING_PRODUCER_INFO';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "producer_access_token" TEXT,
ADD COLUMN     "producer_access_token_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "project_messages" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "kind" "ProjectMessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_messages_project_id_idx" ON "project_messages"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_producer_access_token_key" ON "projects"("producer_access_token");

-- AddForeignKey
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
