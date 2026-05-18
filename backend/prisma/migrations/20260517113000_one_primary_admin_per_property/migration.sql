ALTER TABLE `property_assignments`
  ADD COLUMN `primaryAdminPropertyId` VARCHAR(191) NULL;

UPDATE `property_assignments`
SET `primaryAdminPropertyId` = `propertyId`
WHERE `role` = 'ADMIN';

CREATE UNIQUE INDEX `property_assignments_primaryAdminPropertyId_key`
  ON `property_assignments`(`primaryAdminPropertyId`);

CREATE TRIGGER `property_assignments_primary_admin_bi`
BEFORE INSERT ON `property_assignments`
FOR EACH ROW
SET NEW.`primaryAdminPropertyId` =
  CASE
    WHEN NEW.`role` = 'ADMIN' THEN NEW.`propertyId`
    ELSE NULL
  END;

CREATE TRIGGER `property_assignments_primary_admin_bu`
BEFORE UPDATE ON `property_assignments`
FOR EACH ROW
SET NEW.`primaryAdminPropertyId` =
  CASE
    WHEN NEW.`role` = 'ADMIN' THEN NEW.`propertyId`
    ELSE NULL
  END;
