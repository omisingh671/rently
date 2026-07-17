ALTER TABLE `bookings`
  ADD COLUMN `source` ENUM('PUBLIC', 'WALK_IN') NOT NULL DEFAULT 'PUBLIC';

UPDATE `bookings` AS `booking`
INNER JOIN `booking_status_history` AS `history`
  ON `history`.`bookingId` = `booking`.`id`
SET `booking`.`source` = 'WALK_IN'
WHERE `history`.`note` = 'Manual walk-in booking created from dashboard';
