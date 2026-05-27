-- AlterTable
ALTER TABLE `payment_refunds` ADD COLUMN `refundRequestId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `booking_refund_requests` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'IN_REVIEW', 'REJECTED', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `reason` TEXT NOT NULL,
    `adminNote` TEXT NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `fulfilledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `booking_refund_requests_bookingId_status_idx`(`bookingId`, `status`),
    INDEX `booking_refund_requests_propertyId_status_createdAt_idx`(`propertyId`, `status`, `createdAt`),
    INDEX `booking_refund_requests_userId_status_idx`(`userId`, `status`),
    INDEX `booking_refund_requests_reviewedByUserId_idx`(`reviewedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payment_refunds_refundRequestId_idx` ON `payment_refunds`(`refundRequestId`);

-- AddForeignKey
ALTER TABLE `booking_refund_requests` ADD CONSTRAINT `booking_refund_requests_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_refund_requests` ADD CONSTRAINT `booking_refund_requests_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_refund_requests` ADD CONSTRAINT `booking_refund_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_refund_requests` ADD CONSTRAINT `booking_refund_requests_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_refundRequestId_fkey` FOREIGN KEY (`refundRequestId`) REFERENCES `booking_refund_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
