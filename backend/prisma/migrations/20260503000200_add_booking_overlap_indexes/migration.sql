CREATE INDEX `bookings_roomId_checkIn_checkOut_idx` ON `bookings`(`roomId`, `checkIn`, `checkOut`);
CREATE INDEX `bookings_unitId_checkIn_checkOut_idx` ON `bookings`(`unitId`, `checkIn`, `checkOut`);
CREATE INDEX `bookings_status_checkIn_checkOut_idx` ON `bookings`(`status`, `checkIn`, `checkOut`);
