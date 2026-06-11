

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


INSERT INTO `children` (`id`, `nik`, `nama_anak`, `jenis_kelamin`, `tanggal_lahir`, `nama_orang_tua`, `alamat`, `wilayah`, `created_by`) VALUES
(1, '3374010101010001', 'Alex', 'Laki-laki', '2025-03-15', 'Orang Tua Alex', 'Alamat Alex', 'Sukun', NULL)
