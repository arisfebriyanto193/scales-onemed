ALTER TABLE `measurements`
ADD COLUMN `status_kesehatan` VARCHAR(255) NULL COMMENT 'Status kesehatan saat diukur: Sehat, Sedang Sakit, atau lainnya' AFTER `tinggi_badan`;

