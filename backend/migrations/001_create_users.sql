
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(100)    NOT NULL,
  `password`   VARCHAR(255)    NOT NULL COMMENT 'bcrypt hashed password',
  `nama_lengkap` VARCHAR(150)  NULL     COMMENT 'Nama lengkap petugas',
  `role`       ENUM('admin','petugas') NOT NULL DEFAULT 'petugas',
  `is_active`  TINYINT(1)      NOT NULL DEFAULT 1,
  `last_login` DATETIME        NULL,
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel pengguna sistem PENTING';


INSERT INTO `users` (`username`, `password`, `nama_lengkap`, `role`)
VALUES (
  'admin',
  '$2b$10$rOzJqMPJhFqKvQ8PzVk4bOzJqMPJhFqKvQ8PzVk4bOzJqMPJhF',
  'Administrator',
  'admin'
);
