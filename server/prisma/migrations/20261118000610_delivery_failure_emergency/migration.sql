-- CreateEnum
CREATE TYPE "FailureReason" AS ENUM ('BREAKDOWN', 'ACCIDENT', 'ROAD_BLOCKED', 'FLOOD', 'STRIKE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProduceCondition" AS ENUM ('GOOD', 'PARTLY_DAMAGED', 'BADLY_DAMAGED');

-- AlterEnum
ALTER TYPE "DealSource" ADD VALUE 'EMERGENCY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DealStatus" ADD VALUE 'FAILURE_REQUESTED';
ALTER TYPE "DealStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "emergencyAuto" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "handoverById" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "failureId" TEXT,
ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" INTEGER,
ADD COLUMN     "tierChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeliveryFailure" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "upazilaId" INTEGER NOT NULL,
    "locationNote" TEXT,
    "reason" "FailureReason" NOT NULL,
    "details" TEXT,
    "photo" TEXT,
    "condition" "ProduceCondition" NOT NULL,
    "usableKg" INTEGER NOT NULL,
    "canMove" BOOLEAN NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryFailure_status_idx" ON "DeliveryFailure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_failureId_key" ON "Listing"("failureId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_failureId_fkey" FOREIGN KEY ("failureId") REFERENCES "DeliveryFailure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFailure" ADD CONSTRAINT "DeliveryFailure_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFailure" ADD CONSTRAINT "DeliveryFailure_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFailure" ADD CONSTRAINT "DeliveryFailure_upazilaId_fkey" FOREIGN KEY ("upazilaId") REFERENCES "Upazila"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

