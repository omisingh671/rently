-- CreateTable
CREATE TABLE `billing_settings` (
  `id` VARCHAR(191) NOT NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `legalName` VARCHAR(191) NULL,
  `gstin` VARCHAR(191) NULL,
  `pan` VARCHAR(191) NULL,
  `billingAddress` TEXT NULL,
  `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV-',
  `receiptPrefix` VARCHAR(191) NOT NULL DEFAULT 'RCT-',
  `creditNotePrefix` VARCHAR(191) NOT NULL DEFAULT 'CN-',
  `invoiceSequence` INTEGER NOT NULL DEFAULT 0,
  `receiptSequence` INTEGER NOT NULL DEFAULT 0,
  `creditNoteSequence` INTEGER NOT NULL DEFAULT 0,
  `footerNotes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `billing_settings_propertyId_key`(`propertyId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_documents` (
  `id` VARCHAR(191) NOT NULL,
  `documentKey` VARCHAR(191) NOT NULL,
  `type` ENUM('INVOICE', 'RECEIPT', 'CREDIT_NOTE') NOT NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'CANCELLED', 'VOID') NOT NULL DEFAULT 'ISSUED',
  `documentNumber` VARCHAR(191) NOT NULL,
  `bookingId` VARCHAR(191) NOT NULL,
  `paymentId` VARCHAR(191) NULL,
  `propertyId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NULL,
  `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `discount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `taxable` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `tax` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `total` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `paid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
  `guestSnapshot` JSON NOT NULL,
  `propertySnapshot` JSON NOT NULL,
  `tenantSnapshot` JSON NULL,
  `bookingSnapshot` JSON NOT NULL,
  `priceSnapshot` JSON NOT NULL,
  `taxSnapshot` JSON NULL,
  `paymentSnapshot` JSON NULL,
  `lineItems` JSON NOT NULL,
  `notes` TEXT NULL,
  `pdfUrl` VARCHAR(191) NULL,
  `issuedAt` DATETIME(3) NULL,
  `voidedAt` DATETIME(3) NULL,
  `voidReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `billing_documents_documentKey_key`(`documentKey`),
  UNIQUE INDEX `billing_documents_propertyId_documentNumber_key`(`propertyId`, `documentNumber`),
  INDEX `billing_documents_propertyId_type_status_issuedAt_idx`(`propertyId`, `type`, `status`, `issuedAt`),
  INDEX `billing_documents_tenantId_idx`(`tenantId`),
  INDEX `billing_documents_bookingId_idx`(`bookingId`),
  INDEX `billing_documents_paymentId_idx`(`paymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `billing_settings`
  ADD CONSTRAINT `billing_settings_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_documents`
  ADD CONSTRAINT `billing_documents_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_documents`
  ADD CONSTRAINT `billing_documents_paymentId_fkey`
  FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_documents`
  ADD CONSTRAINT `billing_documents_propertyId_fkey`
  FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_documents`
  ADD CONSTRAINT `billing_documents_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
