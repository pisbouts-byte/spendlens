-- CreateTable
CREATE TABLE "BudgetCarryover" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sourcePeriodStart" TEXT NOT NULL,
    "sourceOverage" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetCarryover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetCarryover_budgetId_idx" ON "BudgetCarryover"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCarryover_budgetId_periodStart_key" ON "BudgetCarryover"("budgetId", "periodStart");

-- AddForeignKey
ALTER TABLE "BudgetCarryover" ADD CONSTRAINT "BudgetCarryover_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
