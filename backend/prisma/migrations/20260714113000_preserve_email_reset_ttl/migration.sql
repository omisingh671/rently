ALTER TABLE `email_delivery_jobs`
  ADD COLUMN `tokenTtlMinutes` INTEGER NOT NULL DEFAULT 15 AFTER `appUrl`;
