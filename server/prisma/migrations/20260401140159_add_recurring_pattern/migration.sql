-- CreateTable
CREATE TABLE "RecurringPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectionType" TEXT NOT NULL,
    "lastSeen" DATE NOT NULL,
    "nextExpected" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringPattern_userId_isActive_idx" ON "RecurringPattern"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPattern_userId_merchantName_amount_key" ON "RecurringPattern"("userId", "merchantName", "amount");

-- AddForeignKey
ALTER TABLE "RecurringPattern" ADD CONSTRAINT "RecurringPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPattern" ADD CONSTRAINT "RecurringPattern_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
