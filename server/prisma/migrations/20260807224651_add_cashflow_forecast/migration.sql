-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('INCOME', 'BILL');

-- CreateEnum
CREATE TYPE "CashFlowFrequency" AS ENUM ('ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "billsAccountBalance" DECIMAL(12,2),
ADD COLUMN     "billsAccountBalanceAsOf" DATE;

-- CreateTable
CREATE TABLE "CashFlowItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "CashFlowFrequency" NOT NULL,
    "anchorDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowOverride" (
    "id" TEXT NOT NULL,
    "cashFlowItemId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashFlowItem_userId_type_isActive_idx" ON "CashFlowItem"("userId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowOverride_cashFlowItemId_periodKey_key" ON "CashFlowOverride"("cashFlowItemId", "periodKey");

-- AddForeignKey
ALTER TABLE "CashFlowItem" ADD CONSTRAINT "CashFlowItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowOverride" ADD CONSTRAINT "CashFlowOverride_cashFlowItemId_fkey" FOREIGN KEY ("cashFlowItemId") REFERENCES "CashFlowItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
