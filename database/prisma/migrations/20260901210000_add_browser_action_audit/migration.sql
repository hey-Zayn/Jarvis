CREATE TABLE "BrowserAction" (
    "id" UUID NOT NULL,
    "actionId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" TEXT,
    "tabId" INTEGER,
    "actionType" TEXT NOT NULL,
    "riskTier" TEXT NOT NULL,
    "payloadSummary" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "BrowserAction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BrowserAction_actionId_key" ON "BrowserAction"("actionId");
CREATE INDEX "BrowserAction_userId_createdAt_idx" ON "BrowserAction"("userId", "createdAt");
CREATE INDEX "BrowserAction_status_idx" ON "BrowserAction"("status");
ALTER TABLE "BrowserAction" ADD CONSTRAINT "BrowserAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
