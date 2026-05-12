ALTER TABLE `bookings`
  ADD COLUMN `bookingRef` VARCHAR(191) NULL,
  ADD COLUMN `guestNameSnapshot` VARCHAR(191) NULL,
  ADD COLUMN `guestEmailSnapshot` VARCHAR(191) NULL,
  ADD COLUMN `guestContactSnapshot` VARCHAR(40) NULL,
  ADD COLUMN `internalNotes` TEXT NULL;

UPDATE `bookings` AS `b`
JOIN `users` AS `u` ON `u`.`id` = `b`.`userId`
SET
  `b`.`bookingRef` = CONCAT('SCH-', YEAR(`b`.`createdAt`), '-', UPPER(SUBSTRING(REPLACE(`b`.`id`, '-', ''), 1, 12))),
  `b`.`guestNameSnapshot` = `u`.`fullName`,
  `b`.`guestEmailSnapshot` = `u`.`email`,
  `b`.`guestContactSnapshot` = `u`.`contactNumber`;

ALTER TABLE `bookings`
  MODIFY `bookingRef` VARCHAR(191) NOT NULL,
  MODIFY `guestNameSnapshot` VARCHAR(191) NOT NULL,
  MODIFY `guestEmailSnapshot` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `bookings_bookingRef_key` ON `bookings`(`bookingRef`);
CREATE INDEX `bookings_bookingRef_idx` ON `bookings`(`bookingRef`);

CREATE TABLE `booking_status_history` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `fromStatus` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') NULL,
  `toStatus` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `booking_status_history_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
  INDEX `booking_status_history_actorUserId_idx`(`actorUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `booking_status_history` (`id`, `bookingId`, `fromStatus`, `toStatus`, `actorUserId`, `note`, `createdAt`)
SELECT UUID(), `id`, NULL, `status`, NULL, 'Backfilled current booking status during lifecycle migration', `createdAt`
FROM `bookings`;

ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
