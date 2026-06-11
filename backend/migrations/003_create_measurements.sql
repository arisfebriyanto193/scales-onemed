

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

INSERT INTO `measurements`
  (`child_id`, `tanggal_kunjungan`, `usia_bulan`, `berat_badan`, `tinggi_badan`)
VALUES
  (1, '2026-03-15', 12,  7.00, 70.00);

