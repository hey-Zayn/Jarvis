-- DropIndex
DROP INDEX "BrowserAction_conversationId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLatitude" DOUBLE PRECISION,
ADD COLUMN     "lastLocationLabel" TEXT,
ADD COLUMN     "lastLongitude" DOUBLE PRECISION,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3);
