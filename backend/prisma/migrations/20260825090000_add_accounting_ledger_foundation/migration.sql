-- Phase 1 accounting foundation. Production execution is a manual DevOps operation.
ALTER TABLE `billing_documents` ADD COLUMN `paymentRefundId` VARCHAR(191) NULL,
    ADD COLUMN `voidedByUserId` VARCHAR(191) NULL;

CREATE TABLE `ledger_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `systemKey` ENUM('CASH', 'BANK_CLEARING', 'CARD_CLEARING', 'UPI_CLEARING', 'ONLINE_GATEWAY_CLEARING', 'MANUAL_SETTLEMENT_CLEARING', 'GUEST_DEPOSIT_LIABILITY', 'GUEST_RECEIVABLE', 'COMPANY_RECEIVABLE', 'ROOM_REVENUE', 'FOLIO_REVENUE', 'OTHER_REVENUE', 'GST_OUTPUT', 'OTHER_TAX_PAYABLE', 'REFUND_CLEARING', 'CASH_VARIANCE') NOT NULL,
    `accountType` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CLEARING') NOT NULL,
    `normalBalance` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ledger_accounts_tenantId_accountType_isActive_idx`(`tenantId`, `accountType`, `isActive`),
    UNIQUE INDEX `ledger_accounts_tenantId_code_key`(`tenantId`, `code`),
    UNIQUE INDEX `ledger_accounts_tenantId_systemKey_key`(`tenantId`, `systemKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `journal_entries` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `sourceType` VARCHAR(64) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `sourceSubId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(255) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `status` ENUM('POSTED', 'REVERSED') NOT NULL DEFAULT 'POSTED',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `totalDebit` DECIMAL(14, 2) NOT NULL,
    `totalCredit` DECIMAL(14, 2) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `correlationId` VARCHAR(128) NULL,
    `reversalReason` VARCHAR(500) NULL,
    `reversalOfEntryId` VARCHAR(191) NULL,
    `postedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `journal_entries_balanced_chk` CHECK (`totalDebit` > 0 AND `totalDebit` = `totalCredit`),
    UNIQUE INDEX `journal_entries_idempotencyKey_key`(`idempotencyKey`),
    UNIQUE INDEX `journal_entries_reversalOfEntryId_key`(`reversalOfEntryId`),
    INDEX `journal_entries_tenantId_businessDate_idx`(`tenantId`, `businessDate`),
    INDEX `journal_entries_propertyId_businessDate_idx`(`propertyId`, `businessDate`),
    INDEX `journal_entries_status_postedAt_idx`(`status`, `postedAt`),
    INDEX `journal_entries_actorUserId_postedAt_idx`(`actorUserId`, `postedAt`),
    UNIQUE INDEX `journal_entries_sourceType_sourceId_sourceSubId_key`(`sourceType`, `sourceId`, `sourceSubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `journal_lines` (
    `id` VARCHAR(191) NOT NULL,
    `journalEntryId` VARCHAR(191) NOT NULL,
    `ledgerAccountId` VARCHAR(191) NOT NULL,
    `debitAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `creditAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `bookingId` VARCHAR(191) NULL,
    `bookingGroupId` VARCHAR(191) NULL,
    `companyAccountId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `paymentRefundId` VARCHAR(191) NULL,
    `folioChargeId` VARCHAR(191) NULL,
    `billingDocumentId` VARCHAR(191) NULL,
    `description` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT `journal_lines_one_sided_chk` CHECK (
      (`debitAmount` > 0 AND `creditAmount` = 0) OR
      (`creditAmount` > 0 AND `debitAmount` = 0)
    ),
    INDEX `journal_lines_journalEntryId_idx`(`journalEntryId`),
    INDEX `journal_lines_ledgerAccountId_idx`(`ledgerAccountId`),
    INDEX `journal_lines_bookingId_idx`(`bookingId`),
    INDEX `journal_lines_bookingGroupId_idx`(`bookingGroupId`),
    INDEX `journal_lines_companyAccountId_idx`(`companyAccountId`),
    INDEX `journal_lines_paymentId_idx`(`paymentId`),
    INDEX `journal_lines_paymentRefundId_idx`(`paymentRefundId`),
    INDEX `journal_lines_folioChargeId_idx`(`folioChargeId`),
    INDEX `journal_lines_billingDocumentId_idx`(`billingDocumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `billing_documents_paymentRefundId_idx` ON `billing_documents`(`paymentRefundId`);
CREATE INDEX `billing_documents_voidedByUserId_idx` ON `billing_documents`(`voidedByUserId`);

ALTER TABLE `billing_documents` ADD CONSTRAINT `billing_documents_paymentRefundId_fkey` FOREIGN KEY (`paymentRefundId`) REFERENCES `payment_refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `billing_documents` ADD CONSTRAINT `billing_documents_voidedByUserId_fkey` FOREIGN KEY (`voidedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ledger_accounts` ADD CONSTRAINT `ledger_accounts_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_reversalOfEntryId_fkey` FOREIGN KEY (`reversalOfEntryId`) REFERENCES `journal_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_journalEntryId_fkey` FOREIGN KEY (`journalEntryId`) REFERENCES `journal_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_ledgerAccountId_fkey` FOREIGN KEY (`ledgerAccountId`) REFERENCES `ledger_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_bookingGroupId_fkey` FOREIGN KEY (`bookingGroupId`) REFERENCES `booking_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_companyAccountId_fkey` FOREIGN KEY (`companyAccountId`) REFERENCES `company_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_paymentRefundId_fkey` FOREIGN KEY (`paymentRefundId`) REFERENCES `payment_refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_folioChargeId_fkey` FOREIGN KEY (`folioChargeId`) REFERENCES `booking_folio_charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_billingDocumentId_fkey` FOREIGN KEY (`billingDocumentId`) REFERENCES `billing_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
