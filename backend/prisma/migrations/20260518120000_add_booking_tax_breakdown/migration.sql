ALTER TABLE `bookings`
  ADD COLUMN `subtotalAmount` DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN `taxAmount` DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN `taxBreakdown` JSON NULL;

UPDATE `bookings`
SET `subtotalAmount` = `totalAmount` + `discountAmount`
WHERE `subtotalAmount` = 0;
