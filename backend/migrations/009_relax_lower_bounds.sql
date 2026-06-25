
-- Hapus constraints lama
ALTER TABLE `measurements` DROP CONSTRAINT `chk_berat_badan`;
ALTER TABLE `measurements` DROP CONSTRAINT `chk_tinggi_badan`;

-- Tambahkan constraints baru dengan batas bawah yang sangat rendah (misal 0)
ALTER TABLE `measurements` ADD CONSTRAINT `chk_berat_badan` CHECK (`berat_badan` BETWEEN 0.01 AND 200.0);
ALTER TABLE `measurements` ADD CONSTRAINT `chk_tinggi_badan` CHECK (`tinggi_badan` BETWEEN 0.1 AND 250.0);
