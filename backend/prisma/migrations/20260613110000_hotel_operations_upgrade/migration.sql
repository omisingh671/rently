ALTER TABLE `rooms`
    ADD COLUMN `housekeepingStatus` ENUM('DIRTY', 'CLEANING', 'CLEAN', 'INSPECTED') NOT NULL DEFAULT 'INSPECTED';

ALTER TABLE `bookings`
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `checkedInAt` DATETIME(3) NULL,
    ADD COLUMN `checkedOutAt` DATETIME(3) NULL,
    ADD COLUMN `noShowAt` DATETIME(3) NULL,
    ADD COLUMN `identityVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `identityDocumentType` VARCHAR(50) NULL,
    ADD COLUMN `identityDocumentReference` VARCHAR(100) NULL;

CREATE INDEX `bookings_propertyId_checkedInAt_idx`
    ON `bookings`(`propertyId`, `checkedInAt`);

CREATE INDEX `bookings_propertyId_checkedOutAt_idx`
    ON `bookings`(`propertyId`, `checkedOutAt`);

ALTER TABLE `maintenance_blocks`
    ADD COLUMN `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `assignedToUserId` VARCHAR(191) NULL,
    ADD COLUMN `resolutionNote` TEXT NULL,
    ADD COLUMN `resolvedAt` DATETIME(3) NULL,
    ADD COLUMN `emergencyOverride` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `maintenance_blocks_propertyId_status_priority_idx`
    ON `maintenance_blocks`(`propertyId`, `status`, `priority`);

CREATE INDEX `maintenance_blocks_assignedToUserId_status_idx`
    ON `maintenance_blocks`(`assignedToUserId`, `status`);

CREATE TABLE `booking_operation_events` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `eventType` ENUM(
        'CHECK_IN',
        'CHECK_OUT',
        'NO_SHOW',
        'ROOM_ASSIGNMENT',
        'ROOM_MOVE',
        'STATUS_CORRECTION',
        'BALANCE_OVERRIDE',
        'MAINTENANCE_CONFLICT',
        'FOLIO_CHARGE',
        'FOLIO_CHARGE_VOID'
    ) NOT NULL,
    `note` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_operation_events_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    INDEX `booking_operation_events_propertyId_eventType_createdAt_idx`(`propertyId`, `eventType`, `createdAt`),
    INDEX `booking_operation_events_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `booking_folio_charges` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `voidedByUserId` VARCHAR(191) NULL,
    `type` ENUM('INCIDENTAL', 'PENALTY', 'EXTENSION', 'ADJUSTMENT') NOT NULL,
    `status` ENUM('ACTIVE', 'VOID') NOT NULL DEFAULT 'ACTIVE',
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `note` TEXT NULL,
    `voidReason` TEXT NULL,
    `voidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `booking_folio_charges_bookingId_status_createdAt_idx`(`bookingId`, `status`, `createdAt`),
    INDEX `booking_folio_charges_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
    INDEX `booking_folio_charges_createdByUserId_idx`(`createdByUserId`),
    INDEX `booking_folio_charges_voidedByUserId_idx`(`voidedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `room_housekeeping_events` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `fromStatus` ENUM('DIRTY', 'CLEANING', 'CLEAN', 'INSPECTED') NOT NULL,
    `toStatus` ENUM('DIRTY', 'CLEANING', 'CLEAN', 'INSPECTED') NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_housekeeping_events_roomId_createdAt_idx`(`roomId`, `createdAt`),
    INDEX `room_housekeeping_events_propertyId_toStatus_createdAt_idx`(`propertyId`, `toStatus`, `createdAt`),
    INDEX `room_housekeeping_events_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    INDEX `room_housekeeping_events_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `maintenance_blocks`
    ADD CONSTRAINT `maintenance_blocks_assignedToUserId_fkey`
    FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `booking_operation_events`
    ADD CONSTRAINT `booking_operation_events_bookingId_fkey`
    FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `booking_operation_events_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `booking_operation_events_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `booking_folio_charges`
    ADD CONSTRAINT `booking_folio_charges_bookingId_fkey`
    FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `booking_folio_charges_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `booking_folio_charges_createdByUserId_fkey`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `booking_folio_charges_voidedByUserId_fkey`
    FOREIGN KEY (`voidedByUserId`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `room_housekeeping_events`
    ADD CONSTRAINT `room_housekeeping_events_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `room_housekeeping_events_roomId_fkey`
    FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `room_housekeeping_events_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `room_housekeeping_events_bookingId_fkey`
    FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
