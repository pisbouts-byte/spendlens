-- AlterTable
ALTER TABLE "PlaidAccount" ADD COLUMN     "balanceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "currentBalance" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "CashFlowPayment" (
    "id" TEXT NOT NULL,
    "cashFlowItemId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlowPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowPayment_cashFlowItemId_occurrenceDate_key" ON "CashFlowPayment"("cashFlowItemId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "CashFlowPayment" ADD CONSTRAINT "CashFlowPayment_cashFlowItemId_fkey" FOREIGN KEY ("cashFlowItemId") REFERENCES "CashFlowItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

