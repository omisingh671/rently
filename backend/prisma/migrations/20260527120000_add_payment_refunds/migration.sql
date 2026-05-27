-- CreateTable
CREATE TABLE `payment_refunds` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('MANUAL', 'RAZORPAY', 'STRIPE') NOT NULL,
    `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `method` ENUM('CASH', 'UPI_MANUAL', 'BANK_TRANSFER', 'MANUAL', 'ONLINE_GATEWAY') NOT NULL DEFAULT 'MANUAL',
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `reason` TEXT NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `providerRefundId` VARCHAR(191) NULL,
    `providerRefundStatus` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_refunds_idempotencyKey_key`(`idempotencyKey`),
    UNIQUE INDEX `payment_refunds_provider_providerRefundId_key`(`provider`, `providerRefundId`),
    INDEX `payment_refunds_bookingId_idx`(`bookingId`),
    INDEX `payment_refunds_paymentId_idx`(`paymentId`),
    INDEX `payment_refunds_propertyId_idx`(`propertyId`),
    INDEX `payment_refunds_userId_idx`(`userId`),
    INDEX `payment_refunds_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
