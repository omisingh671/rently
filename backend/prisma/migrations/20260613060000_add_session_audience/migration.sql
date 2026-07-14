ALTER TABLE `sessions`
    ADD COLUMN `audience` ENUM('FRONTEND', 'DASHBOARD') NOT NULL DEFAULT 'DASHBOARD';

CREATE INDEX `sessions_audience_idx` ON `sessions`(`audience`);
