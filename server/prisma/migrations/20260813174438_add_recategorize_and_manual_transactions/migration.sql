-- AlterTable
ALTER TABLE "CashFlowItem" ADD COLUMN     "excludeFromFiftyThirtyTwenty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fiftyThirtyTwentyCategory" "FiftyThirtyTwentyCategory";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchedTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_matchedTransactionId_key" ON "Transaction"("matchedTransactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_matchedTransactionId_fkey" FOREIGN KEY ("matchedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
