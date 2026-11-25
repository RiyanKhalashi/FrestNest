-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('KG', 'MON', 'TON');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "unit" "Unit" NOT NULL DEFAULT 'KG';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "defaultUnit" "Unit" NOT NULL DEFAULT 'KG';

