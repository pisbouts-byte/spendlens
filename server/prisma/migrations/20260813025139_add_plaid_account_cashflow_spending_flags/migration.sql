-- AlterTable
ALTER TABLE "PlaidAccount" ADD COLUMN     "includeInCashFlow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeInSpending" BOOLEAN NOT NULL DEFAULT true;
