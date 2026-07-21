CREATE TABLE `booking_room_allocations` (
  `id` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `bookingItemId` VARCHAR(191) NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `roomId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `source` ENUM('BOOKING_CREATED', 'ROOM_ASSIGNED', 'CHECK_IN_ASSIGNED', 'ROOM_MOVE') NOT NULL,
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `bra_booking_from_idx`(`bookingId`, `effectiveFrom`),
  INDEX `bra_item_from_idx`(`bookingItemId`, `effectiveFrom`),
  INDEX `bra_property_room_interval_idx`(`propertyId`, `roomId`, `effectiveFrom`, `effectiveTo`),
  INDEX `bra_actor_created_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `booking_room_allocations`
  ADD CONSTRAINT `booking_room_allocations_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `booking_room_allocations`
  ADD CONSTRAINT `booking_room_allocations_bookingItemId_fkey`
  FOREIGN KEY (`bookingItemId`) REFERENCES `booking_items`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `booking_room_allocations`
  ADD CONSTRAINT `booking_room_allocations_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `booking_room_allocations`
  ADD CONSTRAINT `booking_room_allocations_roomId_fkey`
  FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `booking_room_allocations`
  ADD CONSTRAINT `booking_room_allocations_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `booking_room_allocations` (
  `id`, `bookingId`, `bookingItemId`, `propertyId`, `roomId`, `actorUserId`,
  `source`, `effectiveFrom`, `effectiveTo`, `createdAt`
)
SELECT
  UUID(), b.`id`, bi.`id`, b.`propertyId`, bi.`roomId`, b.`userId`,
  'BOOKING_CREATED', b.`checkIn`,
  CASE
    WHEN b.`status` = 'CHECKED_OUT' THEN COALESCE(b.`checkedOutAt`, b.`checkOut`)
    WHEN b.`status` = 'CANCELLED' THEN GREATEST(b.`checkIn`, COALESCE(b.`cancelledAt`, b.`updatedAt`))
    WHEN b.`status` = 'NO_SHOW' THEN GREATEST(b.`checkIn`, COALESCE(b.`noShowAt`, b.`updatedAt`))
    ELSE NULL
  END,
  b.`createdAt`
FROM `booking_items` bi
INNER JOIN `bookings` b ON b.`id` = bi.`bookingId`
WHERE bi.`roomId` IS NOT NULL;

INSERT INTO `booking_room_allocations` (
  `id`, `bookingId`, `bookingItemId`, `propertyId`, `roomId`, `actorUserId`,
  `source`, `effectiveFrom`, `effectiveTo`, `createdAt`
)
SELECT
  UUID(), b.`id`, bi.`id`, b.`propertyId`, r.`id`, b.`userId`,
  'BOOKING_CREATED', b.`checkIn`,
  CASE
    WHEN b.`status` = 'CHECKED_OUT' THEN COALESCE(b.`checkedOutAt`, b.`checkOut`)
    WHEN b.`status` = 'CANCELLED' THEN GREATEST(b.`checkIn`, COALESCE(b.`cancelledAt`, b.`updatedAt`))
    WHEN b.`status` = 'NO_SHOW' THEN GREATEST(b.`checkIn`, COALESCE(b.`noShowAt`, b.`updatedAt`))
    ELSE NULL
  END,
  b.`createdAt`
FROM `booking_items` bi
INNER JOIN `bookings` b ON b.`id` = bi.`bookingId`
INNER JOIN `rooms` r ON r.`unitId` = bi.`unitId`
WHERE bi.`targetType` = 'UNIT' AND bi.`roomId` IS NULL;
