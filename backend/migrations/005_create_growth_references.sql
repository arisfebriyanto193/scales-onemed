-- =====================================================
-- Migration: 005_create_growth_references.sql
-- Deskripsi: Tabel referensi standar pertumbuhan WHO
--            (data kurva pertumbuhan untuk dashboard Gambar 22)
-- Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
-- Tanggal: 2026-06-04
-- =====================================================
-- Data ini digunakan untuk menggambar grafik kurva
-- pertumbuhan standar WHO di halaman Dashboard
-- SD = Standard Deviation (z-score)
-- =====================================================

CREATE TABLE IF NOT EXISTS `growth_references` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `jenis_kelamin` ENUM('Laki-laki','Perempuan') NOT NULL,
  `tipe`          ENUM('BB_U','TB_U') NOT NULL COMMENT 'BB/U=Berat Badan per Umur | TB/U=Tinggi Badan per Umur',
  `usia_bulan`    TINYINT UNSIGNED NOT NULL COMMENT 'Usia dalam bulan (0-60)',
  `sd_minus3`     DECIMAL(5,2)  NOT NULL COMMENT 'Batas bawah -3 SD (Gizi Buruk / Sangat Pendek)',
  `sd_minus2`     DECIMAL(5,2)  NOT NULL COMMENT 'Batas bawah -2 SD (Kurang Gizi / Pendek)',
  `median`        DECIMAL(5,2)  NOT NULL COMMENT 'Nilai median (normal)',
  `sd_plus2`      DECIMAL(5,2)  NOT NULL COMMENT 'Batas atas +2 SD (Gizi Lebih / Tinggi)',
  `sd_plus3`      DECIMAL(5,2)  NULL     COMMENT 'Batas atas +3 SD',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ref_growth` (`jenis_kelamin`, `tipe`, `usia_bulan`),
  INDEX `idx_jenis_tipe` (`jenis_kelamin`, `tipe`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Referensi standar kurva pertumbuhan WHO untuk anak 0-60 bulan';

-- =====================================================
-- Seed: Data referensi WHO BB/U Laki-laki (sample 0-12 bulan)
-- Sumber: WHO Child Growth Standards 2006
-- =====================================================
INSERT INTO `growth_references`
  (`jenis_kelamin`, `tipe`, `usia_bulan`, `sd_minus3`, `sd_minus2`, `median`, `sd_plus2`, `sd_plus3`)
VALUES
  -- BB/U Laki-laki (kg)
  ('Laki-laki', 'BB_U',  0,  2.1,  2.9,  3.3,  4.4,  5.0),
  ('Laki-laki', 'BB_U',  1,  2.9,  3.9,  4.5,  5.8,  6.6),
  ('Laki-laki', 'BB_U',  2,  3.8,  4.9,  5.6,  7.1,  8.0),
  ('Laki-laki', 'BB_U',  3,  4.4,  5.7,  6.4,  8.0,  9.0),
  ('Laki-laki', 'BB_U',  4,  4.9,  6.2,  7.0,  8.7,  9.7),
  ('Laki-laki', 'BB_U',  5,  5.3,  6.7,  7.5,  9.3, 10.4),
  ('Laki-laki', 'BB_U',  6,  5.7,  7.1,  7.9,  9.8, 10.9),
  ('Laki-laki', 'BB_U',  7,  5.9,  7.4,  8.3, 10.3, 11.4),
  ('Laki-laki', 'BB_U',  8,  6.2,  7.7,  8.6, 10.7, 11.9),
  ('Laki-laki', 'BB_U',  9,  6.4,  8.0,  8.9, 11.0, 12.3),
  ('Laki-laki', 'BB_U', 10,  6.6,  8.2,  9.2, 11.4, 12.7),
  ('Laki-laki', 'BB_U', 11,  6.8,  8.4,  9.4, 11.7, 13.0),
  ('Laki-laki', 'BB_U', 12,  6.9,  8.6,  9.6, 11.9, 13.3),

  -- BB/U Perempuan (kg)
  ('Perempuan', 'BB_U',  0,  2.0,  2.8,  3.2,  4.2,  4.8),
  ('Perempuan', 'BB_U',  1,  2.7,  3.6,  4.2,  5.5,  6.2),
  ('Perempuan', 'BB_U',  2,  3.4,  4.5,  5.1,  6.6,  7.5),
  ('Perempuan', 'BB_U',  3,  4.0,  5.2,  5.8,  7.5,  8.5),
  ('Perempuan', 'BB_U',  4,  4.4,  5.7,  6.4,  8.2,  9.3),
  ('Perempuan', 'BB_U',  5,  4.8,  6.1,  6.9,  8.8,  9.9),
  ('Perempuan', 'BB_U',  6,  5.1,  6.5,  7.3,  9.3, 10.5),
  ('Perempuan', 'BB_U',  7,  5.3,  6.8,  7.6,  9.8, 11.1),
  ('Perempuan', 'BB_U',  8,  5.6,  7.0,  7.9, 10.2, 11.6),
  ('Perempuan', 'BB_U',  9,  5.8,  7.3,  8.2, 10.5, 11.9),
  ('Perempuan', 'BB_U', 10,  5.9,  7.5,  8.5, 10.9, 12.3),
  ('Perempuan', 'BB_U', 11,  6.1,  7.7,  8.7, 11.2, 12.6),
  ('Perempuan', 'BB_U', 12,  6.3,  7.9,  8.9, 11.5, 13.0),

  -- TB/U Laki-laki (cm)
  ('Laki-laki', 'TB_U',  0, 44.2, 46.1, 49.9, 53.7, 55.6),
  ('Laki-laki', 'TB_U',  1, 48.9, 50.8, 54.7, 58.6, 60.6),
  ('Laki-laki', 'TB_U',  2, 52.4, 54.4, 58.4, 62.4, 64.4),
  ('Laki-laki', 'TB_U',  3, 55.3, 57.3, 61.4, 65.5, 67.6),
  ('Laki-laki', 'TB_U',  4, 57.6, 59.7, 63.9, 68.0, 70.1),
  ('Laki-laki', 'TB_U',  5, 59.6, 61.7, 65.9, 70.1, 72.2),
  ('Laki-laki', 'TB_U',  6, 61.2, 63.3, 67.6, 71.9, 74.0),
  ('Laki-laki', 'TB_U',  7, 62.7, 64.8, 69.2, 73.5, 75.7),
  ('Laki-laki', 'TB_U',  8, 64.0, 66.2, 70.6, 75.0, 77.2),
  ('Laki-laki', 'TB_U',  9, 65.2, 67.5, 72.0, 76.5, 78.7),
  ('Laki-laki', 'TB_U', 10, 66.4, 68.7, 73.3, 77.9, 80.1),
  ('Laki-laki', 'TB_U', 11, 67.6, 69.9, 74.5, 79.2, 81.5),
  ('Laki-laki', 'TB_U', 12, 68.6, 71.0, 75.7, 80.5, 82.9),

  -- TB/U Perempuan (cm)
  ('Perempuan', 'TB_U',  0, 43.6, 45.4, 49.1, 52.9, 54.7),
  ('Perempuan', 'TB_U',  1, 47.8, 49.8, 53.7, 57.6, 59.5),
  ('Perempuan', 'TB_U',  2, 51.0, 53.0, 57.1, 61.1, 63.2),
  ('Perempuan', 'TB_U',  3, 53.5, 55.6, 59.8, 64.0, 66.1),
  ('Perempuan', 'TB_U',  4, 55.6, 57.8, 62.1, 66.4, 68.6),
  ('Perempuan', 'TB_U',  5, 57.4, 59.6, 64.0, 68.5, 70.7),
  ('Perempuan', 'TB_U',  6, 58.9, 61.2, 65.7, 70.3, 72.5),
  ('Perempuan', 'TB_U',  7, 60.3, 62.7, 67.3, 71.9, 74.2),
  ('Perempuan', 'TB_U',  8, 61.7, 64.0, 68.7, 73.5, 75.8),
  ('Perempuan', 'TB_U',  9, 62.9, 65.3, 70.1, 75.0, 77.4),
  ('Perempuan', 'TB_U', 10, 64.1, 66.5, 71.5, 76.4, 78.9),
  ('Perempuan', 'TB_U', 11, 65.2, 67.7, 72.8, 77.8, 80.3),
  ('Perempuan', 'TB_U', 12, 66.3, 68.9, 74.0, 79.2, 81.7);
