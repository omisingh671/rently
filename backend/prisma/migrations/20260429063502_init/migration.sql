-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(8) NULL,
    `contactNumber` VARCHAR(20) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'GUEST') NOT NULL DEFAULT 'GUEST',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_refreshToken_key`(`refreshToken`),
    INDEX `sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_reset_tokens_userId_idx`(`userId`),
    INDEX `password_reset_tokens_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `properties` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `properties_name_city_state_key`(`name`, `city`, `state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `unitNumber` VARCHAR(191) NOT NULL,
    `floor` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `units_propertyId_idx`(`propertyId`),
    UNIQUE INDEX `units_propertyId_unitNumber_key`(`propertyId`, `unitNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `rent` DOUBLE NOT NULL,
    `hasAC` BOOLEAN NOT NULL DEFAULT false,
    `maxOccupancy` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rooms_unitId_idx`(`unitId`),
    UNIQUE INDEX `rooms_unitId_number_key`(`unitId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_products` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `occupancy` INTEGER NOT NULL,
    `hasAC` BOOLEAN NOT NULL,
    `category` ENUM('NIGHTLY', 'LONG_STAY', 'CORPORATE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `room_products_propertyId_idx`(`propertyId`),
    UNIQUE INDEX `room_products_propertyId_name_key`(`propertyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_pricing` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NULL,
    `unitId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `rateType` ENUM('NIGHTLY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'NIGHTLY',
    `pricingTier` ENUM('STANDARD', 'CORPORATE', 'SEASONAL') NOT NULL DEFAULT 'STANDARD',
    `minNights` INTEGER NOT NULL DEFAULT 1,
    `maxNights` INTEGER NULL,
    `taxInclusive` BOOLEAN NOT NULL DEFAULT false,
    `price` DECIMAL(65, 30) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_pricing_propertyId_idx`(`propertyId`),
    INDEX `room_pricing_roomId_idx`(`roomId`),
    INDEX `room_pricing_unitId_idx`(`unitId`),
    INDEX `room_pricing_productId_idx`(`productId`),
    INDEX `room_pricing_validFrom_validTo_idx`(`validFrom`, `validTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_requests` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `targetType` ENUM('ROOM', 'UNIT') NOT NULL,
    `unitId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `status` ENUM('NEW', 'IN_PROGRESS', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quote_requests_propertyId_idx`(`propertyId`),
    INDEX `quote_requests_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `targetType` ENUM('ROOM', 'UNIT') NOT NULL,
    `unitId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `targetLabel` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `pricePerNight` DECIMAL(65, 30) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `totalAmount` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bookings_propertyId_idx`(`propertyId`),
    INDEX `bookings_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `amenities` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `amenities_propertyId_idx`(`propertyId`),
    UNIQUE INDEX `amenities_propertyId_name_key`(`propertyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `property_amenities` (
    `propertyId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`propertyId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_amenities` (
    `unitId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    INDEX `unit_amenities_amenityId_idx`(`amenityId`),
    PRIMARY KEY (`unitId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_amenities` (
    `roomId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`roomId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enquiries` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contactNumber` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `status` ENUM('NEW', 'IN_PROGRESS', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `enquiries_propertyId_idx`(`propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `property_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER') NOT NULL,
    `assignedByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `property_assignments_userId_idx`(`userId`),
    INDEX `property_assignments_propertyId_role_idx`(`propertyId`, `role`),
    UNIQUE INDEX `property_assignments_propertyId_userId_key`(`propertyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NULL,
    `roomId` VARCHAR(191) NULL,
    `targetType` ENUM('PROPERTY', 'UNIT', 'ROOM') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_blocks_propertyId_idx`(`propertyId`),
    INDEX `maintenance_blocks_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taxes` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(65, 30) NOT NULL,
    `taxType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `appliesTo` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `taxes_propertyId_idx`(`propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DECIMAL(65, 30) NOT NULL,
    `maxUses` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `minNights` INTEGER NULL,
    `minAmount` DECIMAL(65, 30) NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `coupons_propertyId_idx`(`propertyId`),
    UNIQUE INDEX `coupons_propertyId_code_key`(`propertyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `properties` ADD CONSTRAINT `properties_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_products` ADD CONSTRAINT `room_products_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_pricing` ADD CONSTRAINT `room_pricing_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_pricing` ADD CONSTRAINT `fk_room_pricing_room` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_pricing` ADD CONSTRAINT `fk_room_pricing_unit` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_pricing` ADD CONSTRAINT `fk_room_pricing_product` FOREIGN KEY (`productId`) REFERENCES `room_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `quote_requests_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `fk_quote_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `fk_quote_product` FOREIGN KEY (`productId`) REFERENCES `room_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `fk_booking_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_amenities` ADD CONSTRAINT `fk_property_amenity_property` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_amenities` ADD CONSTRAINT `fk_property_amenity_amenity` FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_amenities` ADD CONSTRAINT `fk_unit_amenity_unit` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_amenities` ADD CONSTRAINT `fk_unit_amenity_amenity` FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_amenities` ADD CONSTRAINT `fk_room_amenity_room` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_amenities` ADD CONSTRAINT `fk_room_amenity_amenity` FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_assignments` ADD CONSTRAINT `property_assignments_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_assignments` ADD CONSTRAINT `property_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_assignments` ADD CONSTRAINT `property_assignments_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_blocks` ADD CONSTRAINT `maintenance_blocks_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_blocks` ADD CONSTRAINT `maintenance_blocks_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_blocks` ADD CONSTRAINT `maintenance_blocks_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_blocks` ADD CONSTRAINT `maintenance_blocks_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taxes` ADD CONSTRAINT `taxes_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
