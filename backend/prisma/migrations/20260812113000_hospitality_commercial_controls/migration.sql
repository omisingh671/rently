-- AlterTable
ALTER TABLE `billing_documents` ADD COLUMN `fiscalYear` VARCHAR(9) NULL,
    ADD COLUMN `pdfDeadLetteredAt` DATETIME(3) NULL,
    ADD COLUMN `pdfNextAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `placeOfSupplyStateCode` VARCHAR(2) NULL,
    ADD COLUMN `recipientGstin` VARCHAR(32) NULL,
    ADD COLUMN `sacCode` VARCHAR(16) NULL,
    ADD COLUMN `supplierStateCode` VARCHAR(2) NULL,
    MODIFY `pdfStatus` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `billing_settings` ADD COLUMN `sacCode` VARCHAR(16) NOT NULL DEFAULT '996311',
    ADD COLUMN `stateCode` VARCHAR(2) NULL;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `billingAddressSnapshot` TEXT NULL,
    ADD COLUMN `bookingGroupId` VARCHAR(191) NULL,
    ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD COLUMN `placeOfSupplyStateCode` VARCHAR(2) NULL,
    ADD COLUMN `recipientGstin` VARCHAR(32) NULL,
    ADD COLUMN `recipientLegalName` VARCHAR(191) NULL,
    MODIFY `source` ENUM('PUBLIC', 'WALK_IN', 'CORPORATE', 'GROUP') NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE `email_delivery_jobs` ADD COLUMN `deadLetteredAt` DATETIME(3) NULL,
    ADD COLUMN `nextAttemptAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `inventory_locks` ADD COLUMN `bookingGroupId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `notification_delivery_jobs` ADD COLUMN `deadLetteredAt` DATETIME(3) NULL,
    ADD COLUMN `nextAttemptAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `quote_requests` ADD COLUMN `comfortOption` ENUM('AC', 'NON_AC') NULL,
    ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `convertedBookingId` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `guestContactNumber` VARCHAR(191) NULL,
    ADD COLUMN `guestCount` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `guestEmail` VARCHAR(191) NULL,
    ADD COLUMN `guestName` VARCHAR(191) NULL,
    ADD COLUMN `quoteSnapshot` JSON NULL;

-- CreateTable
CREATE TABLE `property_audit_events` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `entityType` ENUM('PROPERTY', 'UNIT', 'ROOM', 'PRICING', 'TAX', 'MAINTENANCE', 'ENQUIRY', 'QUOTE', 'COMPANY', 'BOOKING_GROUP', 'GROUP_FOLIO', 'BILLING_DOCUMENT', 'DAILY_CLOSE') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED', 'VOIDED', 'CONVERTED', 'RETRIED', 'DEAD_LETTERED') NOT NULL,
    `reason` VARCHAR(500) NULL,
    `previousData` JSON NULL,
    `nextData` JSON NULL,
    `metadata` JSON NULL,
    `correlationId` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `property_audit_events_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
    INDEX `property_audit_events_propertyId_entityType_entityId_idx`(`propertyId`, `entityType`, `entityId`),
    INDEX `property_audit_events_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_document_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `type` ENUM('INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL,
    `fiscalYear` VARCHAR(9) NOT NULL,
    `sequence` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billing_document_sequences_propertyId_type_fiscalYear_key`(`propertyId`, `type`, `fiscalYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NULL,
    `fromStatus` ENUM('NEW', 'IN_PROGRESS', 'CLOSED') NULL,
    `toStatus` ENUM('NEW', 'IN_PROGRESS', 'CLOSED') NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_status_history_enquiryId_createdAt_idx`(`enquiryId`, `createdAt`),
    INDEX `lead_status_history_quoteId_createdAt_idx`(`quoteId`, `createdAt`),
    INDEX `lead_status_history_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NULL,
    `gstin` VARCHAR(32) NULL,
    `billingAddress` TEXT NULL,
    `stateCode` VARCHAR(2) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactNumber` VARCHAR(191) NULL,
    `creditLimit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paymentTermsDays` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_accounts_propertyId_isActive_idx`(`propertyId`, `isActive`),
    UNIQUE INDEX `company_accounts_propertyId_legalName_key`(`propertyId`, `legalName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_groups` (
    `id` VARCHAR(191) NOT NULL,
    `groupRef` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('PROSPECT', 'TENTATIVE', 'CONFIRMED', 'IN_HOUSE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PROSPECT',
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `expectedRooms` INTEGER NOT NULL,
    `expectedGuests` INTEGER NOT NULL,
    `releaseDate` DATETIME(3) NULL,
    `billingNotes` TEXT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_groups_groupRef_key`(`groupRef`),
    INDEX `booking_groups_propertyId_status_checkIn_idx`(`propertyId`, `status`, `checkIn`),
    INDEX `booking_groups_companyId_createdAt_idx`(`companyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_folio_charges` (
    `id` VARCHAR(191) NOT NULL,
    `bookingGroupId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'VOID') NOT NULL DEFAULT 'ACTIVE',
    `note` TEXT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `voidedByUserId` VARCHAR(191) NULL,
    `voidReason` TEXT NULL,
    `voidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_folio_charges_bookingGroupId_status_createdAt_idx`(`bookingGroupId`, `status`, `createdAt`),
    INDEX `group_folio_charges_propertyId_createdAt_idx`(`propertyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bookings_companyId_createdAt_idx` ON `bookings`(`companyId`, `createdAt`);

-- CreateIndex
CREATE INDEX `bookings_bookingGroupId_checkIn_checkOut_idx` ON `bookings`(`bookingGroupId`, `checkIn`, `checkOut`);

-- CreateIndex
CREATE INDEX `inventory_locks_bookingGroupId_releasedAt_expiresAt_idx` ON `inventory_locks`(`bookingGroupId`, `releasedAt`, `expiresAt`);

-- CreateIndex
CREATE UNIQUE INDEX `inventory_locks_bookingGroupId_roomId_checkIn_checkOut_key` ON `inventory_locks`(`bookingGroupId`, `roomId`, `checkIn`, `checkOut`);

-- CreateIndex
CREATE UNIQUE INDEX `quote_requests_convertedBookingId_key` ON `quote_requests`(`convertedBookingId`);

-- CreateIndex
CREATE INDEX `quote_requests_propertyId_status_expiresAt_idx` ON `quote_requests`(`propertyId`, `status`, `expiresAt`);

-- AddForeignKey
ALTER TABLE `property_audit_events` ADD CONSTRAINT `property_audit_events_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_audit_events` ADD CONSTRAINT `property_audit_events_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `quote_requests_convertedBookingId_fkey` FOREIGN KEY (`convertedBookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_bookingGroupId_fkey` FOREIGN KEY (`bookingGroupId`) REFERENCES `booking_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_locks` ADD CONSTRAINT `inventory_locks_bookingGroupId_fkey` FOREIGN KEY (`bookingGroupId`) REFERENCES `booking_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_document_sequences` ADD CONSTRAINT `billing_document_sequences_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_status_history` ADD CONSTRAINT `lead_status_history_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_status_history` ADD CONSTRAINT `lead_status_history_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quote_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_status_history` ADD CONSTRAINT `lead_status_history_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_accounts` ADD CONSTRAINT `company_accounts_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_accounts` ADD CONSTRAINT `company_accounts_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_groups` ADD CONSTRAINT `booking_groups_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_groups` ADD CONSTRAINT `booking_groups_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_groups` ADD CONSTRAINT `booking_groups_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_folio_charges` ADD CONSTRAINT `group_folio_charges_bookingGroupId_fkey` FOREIGN KEY (`bookingGroupId`) REFERENCES `booking_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_folio_charges` ADD CONSTRAINT `group_folio_charges_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_folio_charges` ADD CONSTRAINT `group_folio_charges_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_folio_charges` ADD CONSTRAINT `group_folio_charges_voidedByUserId_fkey` FOREIGN KEY (`voidedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
