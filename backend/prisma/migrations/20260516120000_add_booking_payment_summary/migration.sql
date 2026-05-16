ALTER TABLE `bookings`
  ADD COLUMN `paymentStatus` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PENDING' AFTER `totalAmount`;

ALTER TABLE `payments`
  ADD COLUMN `purpose` ENUM('TOKEN', 'BALANCE', 'FULL_PAYMENT') NOT NULL DEFAULT 'TOKEN' AFTER `status`,
  ADD COLUMN `method` ENUM('CASH', 'UPI_MANUAL', 'BANK_TRANSFER', 'MANUAL', 'ONLINE_GATEWAY') NOT NULL DEFAULT 'MANUAL' AFTER `purpose`,
  ADD COLUMN `note` TEXT NULL AFTER `metadata`,
  ADD COLUMN `receivedByUserId` VARCHAR(191) NULL AFTER `note`,
  ADD INDEX `payments_receivedByUserId_idx` (`receivedByUserId`);

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_receivedByUserId_fkey`
  FOREIGN KEY (`receivedByUserId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
