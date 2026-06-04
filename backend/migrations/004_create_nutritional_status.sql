-- =====================================================
-- Migration: 004_create_nutritional_status.sql
-- Deskripsi: Membuat tabel status gizi berdasarkan standar WHO/Kemenkes
-- Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
-- Tanggal: 2026-06-04
-- =====================================================
-- Referensi desain: Gambar 25 - Halaman Cek Status Gizi
-- Kolom: ID, Nama Anak, Wilayah,
--        Status Gizi Berat Badan/Umur,
--        Status Gizi Tinggi Badan/Umur,
--        Status Gizi Keseluruhan
-- =====================================================
-- Standar klasifikasi (WHO Child Growth Standards):
--   BB/U: Gizi Buruk | Kurang Gizi | Berat Badan Normal | Gizi Lebih
--   TB/U: Sangat Pendek | Pendek | Tinggi Normal | Tinggi
--   Status Keseluruhan: Kurang Gizi | Gizi Baik/Normal | Gizi Lebih
-- =====================================================

CREATE TABLE IF NOT EXISTS `nutritional_status` (
  `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `measurement_id`        INT UNSIGNED  NOT NULL COMMENT 'FK ke measurements.id',
  `child_id`              INT UNSIGNED  NOT NULL COMMENT 'FK ke children.id (denormalisasi untuk query cepat)',

  -- Status Gizi Berat Badan terhadap Umur (BB/U)
  `status_bb_umur`        ENUM(
    'Gizi Buruk',
    'Kurang Gizi',
    'Berat Badan Normal',
    'Gizi Lebih'
  ) NOT NULL DEFAULT 'Berat Badan Normal' COMMENT 'Klasifikasi BB/U berdasarkan z-score WHO',

  -- Nilai z-score BB/U (untuk referensi)
  `zscore_bb_umur`        DECIMAL(5,2)  NULL COMMENT 'Nilai z-score BB/U WHO',

  -- Status Gizi Tinggi Badan terhadap Umur (TB/U)
  `status_tb_umur`        ENUM(
    'Sangat Pendek',
    'Pendek',
    'Tinggi Normal',
    'Tinggi'
  ) NOT NULL DEFAULT 'Tinggi Normal' COMMENT 'Klasifikasi TB/U berdasarkan z-score WHO (indikator stunting)',

  -- Nilai z-score TB/U (untuk referensi)
  `zscore_tb_umur`        DECIMAL(5,2)  NULL COMMENT 'Nilai z-score TB/U WHO',

  -- Status Gizi Keseluruhan
  `status_keseluruhan`    ENUM(
    'Kurang Gizi',
    'Gizi Baik/Normal',
    'Gizi Lebih'
  ) NOT NULL DEFAULT 'Gizi Baik/Normal' COMMENT 'Status gizi keseluruhan anak',

  -- Flag deteksi stunting (TB/U Pendek atau Sangat Pendek)
  `is_stunting`           TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 jika terindikasi stunting (TB/U < -2 SD)',

  -- Flag deteksi wasting (BB sangat rendah)
  `is_wasting`            TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 jika wasting (BB/U < -3 SD)',

  `calculated_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu kalkulasi status',
  `created_at`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_measurement` (`measurement_id`) COMMENT 'Satu measurement satu status',
  INDEX `idx_child_id`      (`child_id`),
  INDEX `idx_is_stunting`   (`is_stunting`),
  INDEX `idx_status_overall` (`status_keseluruhan`),

  CONSTRAINT `fk_status_measurement`
    FOREIGN KEY (`measurement_id`) REFERENCES `measurements`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_status_child`
    FOREIGN KEY (`child_id`) REFERENCES `children`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel hasil analisis status gizi anak berdasarkan standar WHO';

-- =====================================================
-- Seed: Sample status gizi (sesuai desain Gambar 25)
-- ID measurement 1-8 sesuai data seed di tabel measurements
-- =====================================================
INSERT INTO `nutritional_status`
  (`measurement_id`, `child_id`, `status_bb_umur`, `status_tb_umur`, `status_keseluruhan`, `is_stunting`, `is_wasting`)
VALUES
  (1, 1, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0),  -- Alex
  (2, 2, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0),  -- Cintya
  (3, 3, 'Kurang Gizi',        'Pendek',        'Kurang Gizi',       1, 0),  -- Yogi (stunting)
  (4, 4, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0),  -- Clint
  (5, 5, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0),  -- Gery
  (6, 6, 'Kurang Gizi',        'Pendek',        'Kurang Gizi',       1, 0),  -- Tasya (stunting)
  (7, 7, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0),  -- Budi
  (8, 8, 'Berat Badan Normal', 'Tinggi Normal', 'Gizi Baik/Normal', 0, 0);  -- Nobu
