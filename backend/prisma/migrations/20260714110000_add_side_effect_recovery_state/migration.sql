ALTER TABLE `billing_documents`
  ADD COLUMN `pdfStatus` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `pdfAttemptCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `pdfMaxAttempts` INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN `pdfLastError` TEXT NULL,
  ADD COLUMN `pdfCorrelationId` VARCHAR(128) NULL,
  ADD COLUMN `pdfProcessingStartedAt` DATETIME(3) NULL,
  ADD COLUMN `pdfRenderedAt` DATETIME(3) NULL;

CREATE TABLE `email_delivery_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('PASSWORD_RESET') NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `userId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `appUrl` VARCHAR(191) NOT NULL,
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `maxAttempts` INTEGER NOT NULL DEFAULT 3,
  `lastError` TEXT NULL,
  `correlationId` VARCHAR(128) NULL,
  `processingStartedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `email_delivery_jobs_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `email_delivery_jobs_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_delivery_jobs`
  ADD CONSTRAINT `email_delivery_jobs_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
