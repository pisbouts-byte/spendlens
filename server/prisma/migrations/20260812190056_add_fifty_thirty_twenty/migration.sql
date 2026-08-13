-- CreateEnum
CREATE TYPE "FiftyThirtyTwentyCategory" AS ENUM ('NECESSITY', 'WANT', 'SAVINGS', 'INCOME');

-- CreateTable
CREATE TABLE "FiftyThirtyTwentyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FiftyThirtyTwentyCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "CashFlowFrequency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiftyThirtyTwentyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiftyThirtyTwentyItem_userId_category_isActive_idx" ON "FiftyThirtyTwentyItem"("userId", "category", "isActive");

-- AddForeignKey
ALTER TABLE "FiftyThirtyTwentyItem" ADD CONSTRAINT "FiftyThirtyTwentyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
