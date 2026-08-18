-- Add a durable, idempotent inbox for payment-provider webhooks.
CREATE TABLE `payment_webhook_events` (
  `id` VARCHAR(191) NOT NULL,
  `provider` ENUM('MANUAL', 'RAZORPAY', 'STRIPE') NOT NULL,
  `providerEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(100) NOT NULL,
  `status` ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
  `payload` JSON NOT NULL,
  `payloadHash` CHAR(64) NOT NULL,
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `payment_webhook_events_provider_providerEventId_key` (`provider`, `providerEventId`),
  INDEX `payment_webhook_events_status_receivedAt_idx` (`status`, `receivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `payments_provider_providerOrderId_key`
  ON `payments`(`provider`, `providerOrderId`);
