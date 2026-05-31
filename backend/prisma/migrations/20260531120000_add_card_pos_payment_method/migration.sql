-- Add CARD_POS to payment method enums stored on payments and refunds.
ALTER TABLE `payments`
  MODIFY `method` ENUM('CASH', 'UPI_MANUAL', 'BANK_TRANSFER', 'CARD_POS', 'MANUAL', 'ONLINE_GATEWAY') NOT NULL DEFAULT 'MANUAL';

ALTER TABLE `payment_refunds`
  MODIFY `method` ENUM('CASH', 'UPI_MANUAL', 'BANK_TRANSFER', 'CARD_POS', 'MANUAL', 'ONLINE_GATEWAY') NOT NULL DEFAULT 'MANUAL';
