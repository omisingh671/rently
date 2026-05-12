ALTER TABLE `bookings`
  ADD COLUMN `cancellationReason` TEXT NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL;
