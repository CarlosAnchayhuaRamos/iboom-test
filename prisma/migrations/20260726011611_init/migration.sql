-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('ACTIVE', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "QuotaStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "credits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "numberOfQuotas" INTEGER NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotas" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "QuotaStatus" NOT NULL DEFAULT 'PENDING',
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_locks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credits_userId_idx" ON "credits"("userId");

-- CreateIndex
CREATE INDEX "quotas_creditId_idx" ON "quotas"("creditId");

-- CreateIndex
CREATE INDEX "quotas_status_idx" ON "quotas"("status");

-- CreateIndex
CREATE INDEX "quotas_dueDate_idx" ON "quotas"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_method_path_key" ON "idempotency_records"("key", "method", "path");

-- CreateIndex
CREATE UNIQUE INDEX "job_locks_name_key" ON "job_locks"("name");

-- AddForeignKey
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
