-- =====================================================
-- Migration: 002_create_children.sql
-- Deskripsi: Membuat tabel data anak (identitas)
-- Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
-- Tanggal: 2026-06-04
-- =====================================================
-- Referensi desain: Gambar 23 - Halaman Data Anak
-- Fields: NIK Anak, Nama Anak, Jenis Kelamin,
--         Nama Orang Tua, Alamat, Nomor Telepon
-- =====================================================

CREATE TABLE IF NOT EXISTS `children` (
  `id`              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `nik`             VARCHAR(16)      NOT NULL COMMENT 'NIK Anak (16 digit)',
  `nama_anak`       VARCHAR(150)     NOT NULL COMMENT 'Nama lengkap anak',
  `jenis_kelamin`   ENUM('Laki-laki','Perempuan') NOT NULL,
  `tanggal_lahir`   DATE             NOT NULL COMMENT 'Tanggal lahir anak',
  `nama_orang_tua`  VARCHAR(150)     NOT NULL COMMENT 'Nama ayah/ibu/wali',
  `alamat`          TEXT             NOT NULL COMMENT 'Alamat lengkap',
  `wilayah`         VARCHAR(100)     NULL     COMMENT 'Nama kelurahan/wilayah Posyandu',
  `nomor_telepon`   VARCHAR(15)      NULL     COMMENT 'No. HP orang tua',
  `created_by`      INT UNSIGNED     NULL     COMMENT 'FK ke users.id',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nik` (`nik`),
  INDEX `idx_nama_anak` (`nama_anak`),
  INDEX `idx_wilayah` (`wilayah`),
  INDEX `idx_jenis_kelamin` (`jenis_kelamin`),
  CONSTRAINT `fk_children_user`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel identitas anak yang terdaftar di Posyandu';

-- =====================================================
-- Seed: Sample data anak (sesuai desain Gambar 24)
-- =====================================================
INSERT INTO `children`
  (`nik`, `nama_anak`, `jenis_kelamin`, `tanggal_lahir`, `nama_orang_tua`, `alamat`, `wilayah`, `nomor_telepon`)
VALUES
  ('3374010101250001', 'Alex',   'Laki-laki',  '2025-03-15', 'Budi Santoso',    'Jl. Tembalang No. 1',  'Tembalang', '081234567890'),
  ('3374010104190002', 'Cintya', 'Perempuan',  '2025-04-19', 'Dewi Rahayu',     'Jl. Tembalang No. 2',  'Tembalang', '081234567891'),
  ('3374010109250003', 'Yogi',   'Laki-laki',  '2025-09-25', 'Agus Prabowo',    'Jl. Tembalang No. 3',  'Tembalang', '081234567892'),
  ('3374010101170004', 'Clint',  'Laki-laki',  '2025-01-17', 'Siti Fatimah',    'Jl. Tembalang No. 4',  'Tembalang', '081234567893'),
  ('3374010103150005', 'Gery',   'Laki-laki',  '2025-03-15', 'Hendra Wijaya',   'Jl. Tembalang No. 5',  'Tembalang', '081234567894'),
  ('3374010104190006', 'Tasya',  'Perempuan',  '2025-04-19', 'Rina Kusuma',     'Jl. Tembalang No. 6',  'Tembalang', '081234567895'),
  ('3374010109250007', 'Budi',   'Laki-laki',  '2025-09-25', 'Wahyu Hidayat',   'Jl. Tembalang No. 7',  'Tembalang', '081234567896'),
  ('3374010101170008', 'Nobu',   'Laki-laki',  '2025-01-17', 'Lestari Ningrum', 'Jl. Tembalang No. 8',  'Tembalang', '081234567897');
