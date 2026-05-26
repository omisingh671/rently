-- AlterTable
ALTER TABLE `bookings`
  ADD COLUMN `taxableAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `booking_items`
  ADD COLUMN `pricingId` VARCHAR(191) NULL,
  ADD COLUMN `subtotalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN `taxableAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  ADD COLUMN `taxBreakdown` JSON NULL,
  ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `taxes`
  ADD COLUMN `category` ENUM('GENERIC', 'GST') NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN `scope` ENUM('BOOKING', 'ACCOMMODATION') NOT NULL DEFAULT 'BOOKING',
  ADD COLUMN `targetType` ENUM('ALL', 'ROOM', 'UNIT') NOT NULL DEFAULT 'ALL',
  ADD COLUMN `calculationMode` ENUM('FLAT', 'SLAB_PER_ITEM_NIGHTLY_TARIFF') NOT NULL DEFAULT 'FLAT',
  ADD COLUMN `discountTreatment` ENUM('BEFORE_TAX') NOT NULL DEFAULT 'BEFORE_TAX',
  ADD COLUMN `minTariff` DECIMAL(65, 30) NULL,
  ADD COLUMN `maxTariff` DECIMAL(65, 30) NULL,
  ADD COLUMN `validFrom` DATETIME(3) NULL,
  ADD COLUMN `validTo` DATETIME(3) NULL,
  ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 0;

-- Backfill existing snapshots without changing historical payable totals.
UPDATE `bookings`
SET `taxableAmount` = GREATEST(`subtotalAmount` - `discountAmount`, 0);

UPDATE `booking_items`
SET
  `subtotalAmount` = `totalAmount`,
  `taxableAmount` = `totalAmount`,
  `finalAmount` = `totalAmount`;

-- Preserve legacy tax applicability while making old rows explicit.
UPDATE `taxes`
SET
  `category` = 'GENERIC',
  `scope` = 'BOOKING',
  `targetType` = CASE
    WHEN UPPER(TRIM(`appliesTo`)) = 'ROOM' THEN 'ROOM'
    WHEN UPPER(TRIM(`appliesTo`)) = 'UNIT' THEN 'UNIT'
    ELSE 'ALL'
  END,
  `calculationMode` = 'FLAT',
  `discountTreatment` = 'BEFORE_TAX';

-- CreateIndex
CREATE INDEX `taxes_propertyId_category_scope_targetType_isActive_idx`
  ON `taxes`(`propertyId`, `category`, `scope`, `targetType`, `isActive`);
