-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('UPAZILA', 'DISTRICT', 'NATION');

-- CreateEnum
CREATE TYPE "SellMode" AS ENUM ('BID', 'OWN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('OPEN', 'SOLD', 'NO_SALE', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DealSource" AS ENUM ('BID', 'BUY_NOW', 'OFFER');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('AWAITING_TRANSPORT', 'CANCELLED');

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productId" INTEGER,
    "customName" TEXT,
    "customShelfLife" INTEGER,
    "customStorage" "StorageNeed",
    "category" TEXT NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "remainingKg" INTEGER NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "photos" TEXT[],
    "upazilaId" INTEGER NOT NULL,
    "scope" "Scope" NOT NULL,
    "mode" "SellMode" NOT NULL,
    "bidEndsAt" TIMESTAMP(3),
    "minIncrement" DECIMAL(10,2),
    "buyNowPrice" DECIMAL(10,2),
    "relisted" BOOLEAN NOT NULL DEFAULT false,
    "minOrderKg" INTEGER,
    "minResponseHours" INTEGER,
    "status" "ListingStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "counterQtyKg" INTEGER,
    "counterPrice" DECIMAL(10,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "listingId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "offerId" TEXT,
    "quantityKg" INTEGER NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "source" "DealSource" NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'AWAITING_TRANSPORT',
    "cancelledBy" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DistrictNeighbours" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DistrictNeighbours_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ListingDistricts" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ListingDistricts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UpazilaNeighbours" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UpazilaNeighbours_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ListingUpazilas" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ListingUpazilas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_code_key" ON "Listing"("code");

-- CreateIndex
CREATE INDEX "Listing_status_scope_idx" ON "Listing"("status", "scope");

-- CreateIndex
CREATE INDEX "Listing_farmerId_idx" ON "Listing"("farmerId");

-- CreateIndex
CREATE INDEX "Bid_listingId_pricePerKg_idx" ON "Bid"("listingId", "pricePerKg");

-- CreateIndex
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");

-- CreateIndex
CREATE INDEX "Offer_dealerId_status_idx" ON "Offer"("dealerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_code_key" ON "Deal"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_offerId_key" ON "Deal"("offerId");

-- CreateIndex
CREATE INDEX "Deal_farmerId_idx" ON "Deal"("farmerId");

-- CreateIndex
CREATE INDEX "Deal_dealerId_idx" ON "Deal"("dealerId");

-- CreateIndex
CREATE INDEX "_DistrictNeighbours_B_index" ON "_DistrictNeighbours"("B");

-- CreateIndex
CREATE INDEX "_ListingDistricts_B_index" ON "_ListingDistricts"("B");

-- CreateIndex
CREATE INDEX "_UpazilaNeighbours_B_index" ON "_UpazilaNeighbours"("B");

-- CreateIndex
CREATE INDEX "_ListingUpazilas_B_index" ON "_ListingUpazilas"("B");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_upazilaId_fkey" FOREIGN KEY ("upazilaId") REFERENCES "Upazila"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DistrictNeighbours" ADD CONSTRAINT "_DistrictNeighbours_A_fkey" FOREIGN KEY ("A") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DistrictNeighbours" ADD CONSTRAINT "_DistrictNeighbours_B_fkey" FOREIGN KEY ("B") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingDistricts" ADD CONSTRAINT "_ListingDistricts_A_fkey" FOREIGN KEY ("A") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingDistricts" ADD CONSTRAINT "_ListingDistricts_B_fkey" FOREIGN KEY ("B") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UpazilaNeighbours" ADD CONSTRAINT "_UpazilaNeighbours_A_fkey" FOREIGN KEY ("A") REFERENCES "Upazila"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UpazilaNeighbours" ADD CONSTRAINT "_UpazilaNeighbours_B_fkey" FOREIGN KEY ("B") REFERENCES "Upazila"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingUpazilas" ADD CONSTRAINT "_ListingUpazilas_A_fkey" FOREIGN KEY ("A") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingUpazilas" ADD CONSTRAINT "_ListingUpazilas_B_fkey" FOREIGN KEY ("B") REFERENCES "Upazila"("id") ON DELETE CASCADE ON UPDATE CASCADE;
