ALTER TABLE `property_booking_policies`
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `booking_policy_audits` (
  `id` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `previousData` JSON NOT NULL,
  `nextData` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `booking_policy_audits_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
  INDEX `booking_policy_audits_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `booking_policy_audits`
  ADD CONSTRAINT `booking_policy_audits_policyId_fkey`
  FOREIGN KEY (`policyId`) REFERENCES `property_booking_policies`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `booking_policy_audits_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `booking_policy_audits_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
