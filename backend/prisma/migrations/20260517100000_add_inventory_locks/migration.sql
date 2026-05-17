CREATE TABLE `inventory_locks` (
  `id` VARCHAR(191) NOT NULL,
  `lockToken` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `targetType` ENUM('ROOM', 'UNIT') NOT NULL,
  `unitId` VARCHAR(191) NULL,
  `roomId` VARCHAR(191) NULL,
  `checkIn` DATETIME(3) NOT NULL,
  `checkOut` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `releasedAt` DATETIME(3) NULL,
  `bookingId` VARCHAR(191) NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `inventory_locks_lockToken_idx` ON `inventory_locks`(`lockToken`);
CREATE INDEX `inventory_locks_propertyId_expiresAt_releasedAt_idx` ON `inventory_locks`(`propertyId`, `expiresAt`, `releasedAt`);
CREATE INDEX `inventory_locks_roomId_checkIn_checkOut_idx` ON `inventory_locks`(`roomId`, `checkIn`, `checkOut`);
CREATE INDEX `inventory_locks_unitId_checkIn_checkOut_idx` ON `inventory_locks`(`unitId`, `checkIn`, `checkOut`);

ALTER TABLE `inventory_locks`
  ADD CONSTRAINT `inventory_locks_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_locks`
  ADD CONSTRAINT `inventory_locks_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
