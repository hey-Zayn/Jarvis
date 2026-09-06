ALTER TABLE "BrowserAction" ADD COLUMN "conversationId" UUID;
CREATE INDEX "BrowserAction_conversationId_idx" ON "BrowserAction"("conversationId");
ALTER TABLE "BrowserAction" ADD CONSTRAINT "BrowserAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
