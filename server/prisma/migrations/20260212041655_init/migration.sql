-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDay" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccessToken" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "transactionCursor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidAccount" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "mask" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "icon" TEXT NOT NULL DEFAULT 'Tag',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidAccountId" TEXT,
    "plaidTransactionId" TEXT,
    "categoryId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "merchantName" TEXT,
    "originalName" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "originalCategory" TEXT,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "isPending" BOOLEAN NOT NULL DEFAULT false,
    "pendingTransactionId" TEXT,
    "notes" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalCategoryId" TEXT,
    "correctedCategoryId" TEXT NOT NULL,
    "transactionAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "PlaidItem"("plaidItemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_plaidAccountId_key" ON "PlaidAccount"("plaidAccountId");

-- CreateIndex
CREATE INDEX "PlaidAccount_plaidItemId_idx" ON "PlaidAccount"("plaidItemId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_plaidTransactionId_idx" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_isExcluded_idx" ON "Transaction"("userId", "isExcluded");

-- CreateIndex
CREATE INDEX "CategoryCorrection_userId_merchantName_idx" ON "CategoryCorrection"("userId", "merchantName");

-- CreateIndex
CREATE INDEX "CategoryCorrection_userId_createdAt_idx" ON "CategoryCorrection"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Budget_userId_isActive_idx" ON "Budget"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_type_key" ON "Budget"("userId", "categoryId", "type");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidAccount" ADD CONSTRAINT "PlaidAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_plaidAccountId_fkey" FOREIGN KEY ("plaidAccountId") REFERENCES "PlaidAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCorrection" ADD CONSTRAINT "CategoryCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCorrection" ADD CONSTRAINT "CategoryCorrection_originalCategoryId_fkey" FOREIGN KEY ("originalCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCorrection" ADD CONSTRAINT "CategoryCorrection_correctedCategoryId_fkey" FOREIGN KEY ("correctedCategoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
