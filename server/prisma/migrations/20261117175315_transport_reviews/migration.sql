-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PICKUP', 'MINI_TRUCK', 'TRUCK', 'COVERED_VAN');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransportOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'NOT_CHOSEN', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DealStatus" ADD VALUE 'TRANSPORT_CONFIRMED';
ALTER TYPE "DealStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "DealStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "codeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryCode" TEXT,
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "pickupCode" TEXT,
ADD COLUMN     "transportWindowEndsAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '12:00:00'::interval),
ADD COLUMN     "windowExtended" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "regNo" TEXT NOT NULL,
    "capacityKg" INTEGER NOT NULL,
    "facility" "StorageNeed" NOT NULL,
    "docPhoto" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING',
    "statusNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportOffer" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "deliverBy" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "TransportOfferStatus" NOT NULL DEFAULT 'PENDING',
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancelRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "byId" TEXT NOT NULL,
    "byRole" "Role" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_regNo_key" ON "Vehicle"("regNo");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");

-- CreateIndex
CREATE INDEX "TransportOffer_dealId_status_idx" ON "TransportOffer"("dealId", "status");

-- CreateIndex
CREATE INDEX "TransportOffer_vehicleId_status_idx" ON "TransportOffer"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "TransportOffer_transporterId_status_idx" ON "TransportOffer"("transporterId", "status");

-- CreateIndex
CREATE INDEX "CancelRequest_status_idx" ON "CancelRequest"("status");

-- CreateIndex
CREATE INDEX "Review_toId_idx" ON "Review"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_dealId_fromId_toId_key" ON "Review"("dealId", "fromId", "toId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOffer" ADD CONSTRAINT "TransportOffer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOffer" ADD CONSTRAINT "TransportOffer_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportOffer" ADD CONSTRAINT "TransportOffer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelRequest" ADD CONSTRAINT "CancelRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelRequest" ADD CONSTRAINT "CancelRequest_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
