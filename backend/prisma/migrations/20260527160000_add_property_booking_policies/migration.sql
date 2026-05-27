-- CreateEnum
ALTER TABLE `bookings` ADD COLUMN `policySnapshot` JSON NULL;

-- CreateTable
CREATE TABLE `property_booking_policies` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `advancePaymentType` ENUM('NONE', 'FIXED_AMOUNT', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED_AMOUNT',
    `advancePaymentValue` DECIMAL(65, 30) NOT NULL DEFAULT 10,
    `tokenRefundable` BOOLEAN NOT NULL DEFAULT false,
    `cancellationRules` JSON NOT NULL,
    `refundRules` JSON NOT NULL,
    `earlyCheckoutRules` JSON NOT NULL,
    `noShowRules` JSON NOT NULL,
    `guestPolicyText` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `property_booking_policies_propertyId_key`(`propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill property policies from the legacy tenant token settings.
INSERT INTO `property_booking_policies` (
    `id`,
    `propertyId`,
    `advancePaymentType`,
    `advancePaymentValue`,
    `tokenRefundable`,
    `cancellationRules`,
    `refundRules`,
    `earlyCheckoutRules`,
    `noShowRules`,
    `guestPolicyText`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    p.`id`,
    CASE WHEN t.`payAtCheckInEnabled` = true THEN 'FIXED_AMOUNT' ELSE 'NONE' END,
    CASE WHEN t.`payAtCheckInEnabled` = true THEN t.`bookingTokenAmount` ELSE 0 END,
    false,
    JSON_OBJECT('guestCancellationAllowed', true, 'allowedStatuses', JSON_ARRAY('PENDING', 'CONFIRMED'), 'beforeCheckInOnly', true),
    JSON_OBJECT('tokenRefundable', false, 'manualReviewRequired', true),
    JSON_OBJECT('refundUnusedNights', false, 'manualReviewRequired', true),
    JSON_OBJECT('markAfterCheckInCutoff', true, 'tokenRefundable', false),
    'Token, cancellation, refund, early checkout, and no-show rules are governed by the property booking policy shown during checkout.',
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `properties` p
INNER JOIN `tenants` t ON t.`id` = p.`tenantId`
WHERE NOT EXISTS (
    SELECT 1 FROM `property_booking_policies` existing
    WHERE existing.`propertyId` = p.`id`
);

-- AddForeignKey
ALTER TABLE `property_booking_policies` ADD CONSTRAINT `property_booking_policies_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy tenant-level token settings after the backfill.
ALTER TABLE `tenants` DROP COLUMN `payAtCheckInEnabled`, DROP COLUMN `bookingTokenAmount`;
