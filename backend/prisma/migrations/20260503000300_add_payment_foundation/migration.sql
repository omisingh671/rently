CREATE TABLE `payments` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `provider` ENUM('MANUAL', 'RAZORPAY', 'STRIPE') NOT NULL,
  `status` ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(65, 30) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `providerOrderId` VARCHAR(191) NULL,
  `providerPaymentId` VARCHAR(191) NULL,
  `providerSignature` VARCHAR(191) NULL,
  `failureCode` VARCHAR(191) NULL,
  `failureMessage` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `payments_idempotencyKey_key`(`idempotencyKey`),
  UNIQUE INDEX `payments_provider_providerPaymentId_key`(`provider`, `providerPaymentId`),
  INDEX `payments_bookingId_idx`(`bookingId`),
  INDEX `payments_propertyId_idx`(`propertyId`),
  INDEX `payments_userId_idx`(`userId`),
  INDEX `payments_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
