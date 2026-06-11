

-- Hapus constraints lama
ALTER TABLE `measurements` DROP CONSTRAINT `chk_usia_bulan`;
ALTER TABLE `measurements` DROP CONSTRAINT `chk_berat_badan`;
ALTER TABLE `measurements` DROP CONSTRAINT `chk_tinggi_badan`;

-- Ubah tipe kolom usia_bulan agar bisa menampung nilai lebih besar (dari TINYINT ke SMALLINT)
ALTER TABLE `measurements` MODIFY COLUMN `usia_bulan` SMALLINT UNSIGNED NOT NULL COMMENT 'Usia anak saat diukur (dalam bulan)';

-- Tambahkan constraints baru dengan batasan lebih besar (misal max 20 tahun/240 bulan, 150kg, 250cm)
ALTER TABLE `measurements` ADD CONSTRAINT `chk_usia_bulan` CHECK (`usia_bulan` BETWEEN 0 AND 360);
ALTER TABLE `measurements` ADD CONSTRAINT `chk_berat_badan` CHECK (`berat_badan` BETWEEN 0.5 AND 200.0);
ALTER TABLE `measurements` ADD CONSTRAINT `chk_tinggi_badan` CHECK (`tinggi_badan` BETWEEN 30.0 AND 250.0);
