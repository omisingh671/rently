CREATE TABLE `property_daily_closes` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `closedByUserId` VARCHAR(191) NOT NULL,
    `paymentCount` INTEGER NOT NULL,
    `paymentTotal` DECIMAL(12, 2) NOT NULL,
    `refundCount` INTEGER NOT NULL,
    `refundTotal` DECIMAL(12, 2) NOT NULL,
    `netPaymentTotal` DECIMAL(12, 2) NOT NULL,
    `bookingsCreated` INTEGER NOT NULL,
    `checkIns` INTEGER NOT NULL,
    `checkOuts` INTEGER NOT NULL,
    `noShows` INTEGER NOT NULL,
    `note` VARCHAR(500) NULL,
    `closedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `property_daily_closes_propertyId_businessDate_key`(`propertyId`, `businessDate`),
    INDEX `property_daily_closes_closedByUserId_closedAt_idx`(`closedByUserId`, `closedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `property_daily_closes`
    ADD CONSTRAINT `property_daily_closes_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `property_daily_closes`
    ADD CONSTRAINT `property_daily_closes_closedByUserId_fkey`
    FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
