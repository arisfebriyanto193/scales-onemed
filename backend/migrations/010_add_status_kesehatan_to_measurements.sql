ALTER TABLE `measurements`
ADD COLUMN `status_kesehatan` VARCHAR(255) NULL COMMENT 'Status kesehatan saat diukur: Sehat, Sedang Sakit, atau lainnya' AFTER `tinggi_badan`;

ALTER TABLE users
MODIFY COLUMN role ENUM('admin','kader')
NOT NULL DEFAULT 'kader';