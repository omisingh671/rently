CREATE TABLE `billing_setting_audits` (
  `id` VARCHAR(191) NOT NULL,
  `billingSettingId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `previousData` JSON NOT NULL,
  `nextData` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `billing_setting_audits_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
  INDEX `billing_setting_audits_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `billing_setting_audits`
  ADD CONSTRAINT `billing_setting_audits_billingSettingId_fkey`
  FOREIGN KEY (`billingSettingId`) REFERENCES `billing_settings`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `billing_setting_audits_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `billing_setting_audits_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
