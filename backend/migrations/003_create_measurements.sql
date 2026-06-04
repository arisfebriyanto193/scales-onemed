-- =====================================================
-- Migration: 003_create_measurements.sql
-- Deskripsi: Membuat tabel data pengukuran pertumbuhan anak
-- Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
-- Tanggal: 2026-06-04
-- =====================================================
-- Referensi desain: Gambar 24 - Halaman Data Pengukuran
-- Kolom tabel: ID, Nama Anak, Tgl Lahir, Usia,
--              Jenis Kelamin, Berat Badan, Tinggi Badan
-- =====================================================

CREATE TABLE IF NOT EXISTS `measurements` (
  `id`                 INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `child_id`           INT UNSIGNED      NOT NULL COMMENT 'FK ke children.id',
  `tanggal_kunjungan`  DATE              NOT NULL COMMENT 'Tanggal saat pengukuran dilakukan',
  `usia_bulan`         TINYINT UNSIGNED  NOT NULL COMMENT 'Usia anak saat diukur (dalam bulan, 0-60)',
  `berat_badan`        DECIMAL(5,2)      NOT NULL COMMENT 'Berat badan dalam kg, contoh: 7.50',
  `tinggi_badan`       DECIMAL(5,2)      NOT NULL COMMENT 'Tinggi/panjang badan dalam cm, contoh: 70.00',
  `catatan`            TEXT              NULL     COMMENT 'Catatan tambahan petugas',
  `created_by`         INT UNSIGNED      NULL     COMMENT 'FK ke users.id - petugas yang input',
  `created_at`         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_child_id`          (`child_id`),
  INDEX `idx_tanggal_kunjungan` (`tanggal_kunjungan`),
  INDEX `idx_child_tanggal`     (`child_id`, `tanggal_kunjungan`),

  CONSTRAINT `fk_measurements_child`
    FOREIGN KEY (`child_id`) REFERENCES `children`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_measurements_user`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  -- Validasi nilai berat & tinggi
  CONSTRAINT `chk_berat_badan`  CHECK (`berat_badan`  BETWEEN 0.5 AND 30.0),
  CONSTRAINT `chk_tinggi_badan` CHECK (`tinggi_badan` BETWEEN 30.0 AND 130.0),
  CONSTRAINT `chk_usia_bulan`   CHECK (`usia_bulan`   BETWEEN 0 AND 60)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel riwayat pengukuran berat dan tinggi badan anak';

-- =====================================================
-- Seed: Sample data pengukuran (sesuai desain Gambar 24)
-- =====================================================
-- ID anak 1=Alex, 2=Cintya, 3=Yogi, 4=Clint, 5=Gery, 6=Tasya, 7=Budi, 8=Nobu
INSERT INTO `measurements`
  (`child_id`, `tanggal_kunjungan`, `usia_bulan`, `berat_badan`, `tinggi_badan`)
VALUES
  (1, '2026-03-15', 12,  7.00, 70.00),   -- Alex,   1 tahun 0 bulan, Laki-laki
  (2, '2026-04-19', 11,  8.00, 71.00),   -- Cintya, 0 tahun 11 bulan, Perempuan
  (3, '2026-09-25',  6,  9.00, 76.00),   -- Yogi,   0 tahun 6 bulan, Laki-laki
  (4, '2026-01-17', 14, 10.00, 75.00),   -- Clint,  1 tahun 2 bulan, Laki-laki
  (5, '2026-03-15', 12,  7.00, 70.00),   -- Gery,   1 tahun 0 bulan, Laki-laki
  (6, '2026-04-19', 11,  8.00, 71.00),   -- Tasya,  0 tahun 11 bulan, Perempuan
  (7, '2026-09-25',  6,  9.00, 76.00),   -- Budi,   0 tahun 6 bulan, Laki-laki
  (8, '2026-01-17', 14, 10.00, 75.00);   -- Nobu,   1 tahun 2 bulan, Laki-laki
