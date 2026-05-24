CREATE TABLE `_amenities_new` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `_amenities_new_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_amenity_dedup_map` (
    `oldAmenityId` VARCHAR(191) NOT NULL,
    `newAmenityId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`oldAmenityId`),
    INDEX `_amenity_dedup_map_newAmenityId_idx`(`newAmenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_amenity_dedup_map` (`oldAmenityId`, `newAmenityId`)
SELECT
    `id`,
    FIRST_VALUE(`id`) OVER (
        PARTITION BY LOWER(TRIM(`name`))
        ORDER BY `createdAt` ASC, `id` ASC
    ) AS `newAmenityId`
FROM `amenities`;

INSERT INTO `_amenities_new` (`id`, `name`, `icon`, `isActive`, `createdAt`)
SELECT
    `ranked`.`id`,
    TRIM(`ranked`.`name`) AS `name`,
    `ranked`.`icon`,
    `ranked`.`isActive`,
    `ranked`.`createdAt`
FROM (
    SELECT
        `a`.`id`,
        `a`.`name`,
        `a`.`icon`,
        `a`.`isActive`,
        `a`.`createdAt`,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(`a`.`name`))
            ORDER BY `a`.`createdAt` ASC, `a`.`id` ASC
        ) AS `row_num`
    FROM `amenities` `a`
) `ranked`
WHERE `ranked`.`row_num` = 1;

CREATE TABLE `_property_amenities_new` (
    `propertyId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`propertyId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_unit_amenities_new` (
    `unitId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    INDEX `_unit_amenities_new_amenityId_idx`(`amenityId`),
    PRIMARY KEY (`unitId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_room_amenities_new` (
    `roomId` VARCHAR(191) NOT NULL,
    `amenityId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`roomId`, `amenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_property_amenities_new` (`propertyId`, `amenityId`)
SELECT DISTINCT
    `pa`.`propertyId`,
    `map`.`newAmenityId`
FROM `property_amenities` `pa`
INNER JOIN `_amenity_dedup_map` `map`
    ON `map`.`oldAmenityId` = `pa`.`amenityId`;

INSERT INTO `_unit_amenities_new` (`unitId`, `amenityId`)
SELECT DISTINCT
    `ua`.`unitId`,
    `map`.`newAmenityId`
FROM `unit_amenities` `ua`
INNER JOIN `_amenity_dedup_map` `map`
    ON `map`.`oldAmenityId` = `ua`.`amenityId`;

INSERT INTO `_room_amenities_new` (`roomId`, `amenityId`)
SELECT DISTINCT
    `ra`.`roomId`,
    `map`.`newAmenityId`
FROM `room_amenities` `ra`
INNER JOIN `_amenity_dedup_map` `map`
    ON `map`.`oldAmenityId` = `ra`.`amenityId`;

DROP TABLE `room_amenities`;
DROP TABLE `unit_amenities`;
DROP TABLE `property_amenities`;
DROP TABLE `amenities`;

RENAME TABLE `_amenities_new` TO `amenities`;
RENAME TABLE `_property_amenities_new` TO `property_amenities`;
RENAME TABLE `_unit_amenities_new` TO `unit_amenities`;
RENAME TABLE `_room_amenities_new` TO `room_amenities`;

ALTER TABLE `property_amenities`
    ADD CONSTRAINT `fk_property_amenity_property`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_property_amenity_amenity`
    FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `unit_amenities`
    ADD CONSTRAINT `fk_unit_amenity_unit`
    FOREIGN KEY (`unitId`) REFERENCES `units`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_unit_amenity_amenity`
    FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `room_amenities`
    ADD CONSTRAINT `fk_room_amenity_room`
    FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_room_amenity_amenity`
    FOREIGN KEY (`amenityId`) REFERENCES `amenities`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `_amenity_dedup_map`;
