ALTER TABLE `property_booking_policies`
  ADD COLUMN `earlyCheckInRules` JSON NULL AFTER `refundRules`,
  ADD COLUMN `lateCheckoutRules` JSON NULL AFTER `earlyCheckoutRules`,
  ADD COLUMN `downgradeRules` JSON NULL AFTER `lateCheckoutRules`;

UPDATE `property_booking_policies`
SET
  `earlyCheckInRules` = JSON_OBJECT(
    'enabled', TRUE,
    'feeType', 'NONE',
    'feeValue', 0,
    'overrideRole', 'ADMIN'
  ),
  `lateCheckoutRules` = JSON_OBJECT(
    'feeType', 'NIGHTLY_RATE_MULTIPLIER',
    'feeValue', 1,
    'graceMinutes', 0,
    'overrideRole', 'ADMIN'
  ),
  `downgradeRules` = JSON_OBJECT(
    'financialTreatment', 'NO_CREDIT',
    'overrideRole', 'ADMIN'
  );
