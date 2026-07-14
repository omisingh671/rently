ALTER TABLE `booking_folio_charges`
  ADD COLUMN `metadata` JSON NULL;

ALTER TABLE `billing_settings`
  ADD COLUMN `debitNotePrefix` VARCHAR(191) NOT NULL DEFAULT 'DN-',
  ADD COLUMN `debitNoteSequence` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `billing_documents`
  MODIFY COLUMN `type` ENUM('INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL,
  ADD COLUMN `folioChargeId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `billing_documents_folioChargeId_key`(`folioChargeId`),
  ADD INDEX `billing_documents_folioChargeId_idx`(`folioChargeId`);

ALTER TABLE `billing_documents`
  ADD CONSTRAINT `billing_documents_folioChargeId_fkey`
  FOREIGN KEY (`folioChargeId`) REFERENCES `booking_folio_charges`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
