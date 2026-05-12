ALTER TABLE `bookings`
  ADD COLUMN `bookingType` ENUM('SINGLE_TARGET', 'MULTI_ROOM') NOT NULL DEFAULT 'SINGLE_TARGET',
  ADD COLUMN `guestCount` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `booking_items` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `targetType` ENUM('ROOM', 'UNIT') NOT NULL,
  `unitId` VARCHAR(191) NULL,
  `roomId` VARCHAR(191) NULL,
  `targetLabel` VARCHAR(191) NOT NULL,
  `productName` VARCHAR(191) NOT NULL,
  `capacity` INTEGER NOT NULL,
  `pricePerNight` DECIMAL(65, 30) NOT NULL,
  `totalAmount` DECIMAL(65, 30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `booking_items_bookingId_idx`(`bookingId`),
  INDEX `booking_items_roomId_idx`(`roomId`),
  INDEX `booking_items_unitId_idx`(`unitId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `booking_items` (
  `id`,
  `bookingId`,
  `productId`,
  `targetType`,
  `unitId`,
  `roomId`,
  `targetLabel`,
  `productName`,
  `capacity`,
  `pricePerNight`,
  `totalAmount`,
  `createdAt`
)
SELECT
  UUID(),
  `id`,
  `productId`,
  `targetType`,
  `unitId`,
  `roomId`,
  `targetLabel`,
  `productName`,
  1,
  `pricePerNight`,
  `totalAmount`,
  `createdAt`
FROM `bookings`;

ALTER TABLE `booking_items`
  ADD CONSTRAINT `booking_items_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
