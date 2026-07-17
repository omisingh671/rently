ALTER TABLE `property_booking_policies`
  ADD COLUMN `pendingPaymentExpiryMinutes` INTEGER NOT NULL DEFAULT 15;

ALTER TABLE `bookings`
  ADD COLUMN `paymentExpiresAt` DATETIME(3) NULL,
  ADD INDEX `bookings_status_paymentExpiresAt_idx` (`status`, `paymentExpiresAt`);

UPDATE `bookings`
SET `paymentExpiresAt` = DATE_ADD(`createdAt`, INTERVAL 15 MINUTE)
WHERE `status` = 'PENDING'
  AND `paymentPolicy` = 'TOKEN_AT_BOOKING';
