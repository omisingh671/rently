CREATE TABLE `property_closures` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `type` ENUM('HOLIDAY_CLOSURE', 'OWNER_BLOCK') NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `reason` VARCHAR(500) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `cancelledByUserId` VARCHAR(191) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `property_closures_propertyId_status_startDate_endDate_idx`(`propertyId`, `status`, `startDate`, `endDate`),
    INDEX `property_closures_createdByUserId_createdAt_idx`(`createdByUserId`, `createdAt`),
    INDEX `property_closures_cancelledByUserId_cancelledAt_idx`(`cancelledByUserId`, `cancelledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `property_closures`
    ADD CONSTRAINT `property_closures_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `property_closures`
    ADD CONSTRAINT `property_closures_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `property_closures`
    ADD CONSTRAINT `property_closures_cancelledByUserId_fkey`
    FOREIGN KEY (`cancelledByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
