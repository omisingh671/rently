CREATE TABLE `notification_global_settings` (
  `id` VARCHAR(191) NOT NULL,
  `eventKey` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCEEDED', 'REFUND_SUCCEEDED', 'USER_REGISTERED', 'BOOKING_CHECKED_IN', 'BOOKING_CHECKED_OUT') NOT NULL,
  `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `notification_global_settings_eventKey_channel_key`(`eventKey`, `channel`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `property_notification_overrides` (
  `id` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `eventKey` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCEEDED', 'REFUND_SUCCEEDED', 'USER_REGISTERED', 'BOOKING_CHECKED_IN', 'BOOKING_CHECKED_OUT') NOT NULL,
  `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  `state` ENUM('USE_GLOBAL', 'ENABLED', 'DISABLED') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `property_notification_overrides_propertyId_idx`(`propertyId`),
  UNIQUE INDEX `property_notification_overrides_propertyId_eventKey_channel_key`(`propertyId`, `eventKey`, `channel`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_setting_audits` (
  `id` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `scope` ENUM('GLOBAL', 'PROPERTY') NOT NULL,
  `propertyId` VARCHAR(191) NULL,
  `eventKey` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCEEDED', 'REFUND_SUCCEEDED', 'USER_REGISTERED', 'BOOKING_CHECKED_IN', 'BOOKING_CHECKED_OUT') NOT NULL,
  `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  `previousState` ENUM('USE_GLOBAL', 'ENABLED', 'DISABLED') NULL,
  `nextState` ENUM('USE_GLOBAL', 'ENABLED', 'DISABLED') NOT NULL,
  `correlationId` VARCHAR(128) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `notification_setting_audits_createdAt_idx`(`createdAt`),
  INDEX `notification_setting_audits_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
  INDEX `notification_setting_audits_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_delivery_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `eventKey` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCEEDED', 'REFUND_SUCCEEDED', 'USER_REGISTERED', 'BOOKING_CHECKED_IN', 'BOOKING_CHECKED_OUT') NOT NULL,
  `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  `propertyId` VARCHAR(191) NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `maxAttempts` INTEGER NOT NULL DEFAULT 3,
  `lastError` TEXT NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `correlationId` VARCHAR(128) NULL,
  `processingStartedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `notification_delivery_jobs_idempotencyKey_key`(`idempotencyKey`),
  INDEX `notification_delivery_jobs_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `notification_delivery_jobs_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
  INDEX `notification_delivery_jobs_eventKey_createdAt_idx`(`eventKey`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `property_notification_overrides`
  ADD CONSTRAINT `property_notification_overrides_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notification_setting_audits`
  ADD CONSTRAINT `notification_setting_audits_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `notification_setting_audits_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `notification_delivery_jobs`
  ADD CONSTRAINT `notification_delivery_jobs_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
