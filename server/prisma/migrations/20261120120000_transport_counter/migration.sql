-- CreateEnum
CREATE TYPE "CounterState" AS ENUM ('WAITING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CLOSED');

-- AlterTable
ALTER TABLE "TransportOffer" ADD COLUMN     "counterAt" TIMESTAMP(3),
ADD COLUMN     "counterExpiresAt" TIMESTAMP(3),
ADD COLUMN     "counterNote" TEXT,
ADD COLUMN     "counterPrice" INTEGER,
ADD COLUMN     "counterState" "CounterState",
ADD COLUMN     "originalPrice" INTEGER;

-- CreateIndex
CREATE INDEX "TransportOffer_counterState_counterExpiresAt_idx" ON "TransportOffer"("counterState", "counterExpiresAt");

