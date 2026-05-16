-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
