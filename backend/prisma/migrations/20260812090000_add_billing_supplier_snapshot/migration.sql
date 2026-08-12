ALTER TABLE `billing_documents`
  ADD COLUMN `supplierSnapshot` JSON NULL AFTER `propertySnapshot`;
