-- AlterTable
ALTER TABLE `booking_items` ALTER COLUMN `comfortOption` DROP DEFAULT;

-- AlterTable
ALTER TABLE `bookings` ALTER COLUMN `comfortOption` DROP DEFAULT;
