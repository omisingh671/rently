CREATE TABLE `tenants` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `primaryDomain` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `brandName` VARCHAR(191) NOT NULL,
  `logoUrl` VARCHAR(191) NULL,
  `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#4f46e5',
  `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
  `supportEmail` VARCHAR(191) NULL,
  `supportPhone` VARCHAR(191) NULL,
  `defaultCurrency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `tenants_slug_key`(`slug`),
  UNIQUE INDEX `tenants_primaryDomain_key`(`primaryDomain`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tenants` (
  `id`,
  `name`,
  `slug`,
  `primaryDomain`,
  `status`,
  `brandName`,
  `primaryColor`,
  `secondaryColor`,
  `supportEmail`,
  `supportPhone`,
  `defaultCurrency`,
  `timezone`,
  `createdAt`,
  `updatedAt`
) VALUES (
  'tenant_sucasa_default',
  'Sucasa Homes',
  'sucasa',
  NULL,
  'ACTIVE',
  'Sucasa Homes',
  '#4f46e5',
  '#f59e0b',
  'support@sucasa.com',
  '+919000000000',
  'INR',
  'Asia/Kolkata',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);

ALTER TABLE `properties` ADD COLUMN `tenantId` VARCHAR(191) NULL;

UPDATE `properties`
SET `tenantId` = 'tenant_sucasa_default'
WHERE `tenantId` IS NULL;

ALTER TABLE `properties` MODIFY `tenantId` VARCHAR(191) NOT NULL;

ALTER TABLE `properties` DROP INDEX `properties_name_city_state_key`;
CREATE UNIQUE INDEX `properties_tenantId_name_city_state_key` ON `properties`(`tenantId`, `name`, `city`, `state`);
CREATE INDEX `properties_tenantId_idx` ON `properties`(`tenantId`);

ALTER TABLE `properties`
  ADD CONSTRAINT `properties_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
