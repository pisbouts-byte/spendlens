-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "added" INTEGER NOT NULL DEFAULT 0,
    "modified" INTEGER NOT NULL DEFAULT 0,
    "removed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_userId_createdAt_idx" ON "SyncLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_plaidItemId_createdAt_idx" ON "SyncLog"("plaidItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
