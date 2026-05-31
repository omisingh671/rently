ALTER TABLE `property_booking_policies`
  ADD COLUMN `checkInTime` VARCHAR(5) NOT NULL DEFAULT '12:00',
  ADD COLUMN `checkOutTime` VARCHAR(5) NOT NULL DEFAULT '11:00';
