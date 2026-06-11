

ALTER TABLE `children`
  ADD COLUMN `rfid_uid` VARCHAR(20) NULL UNIQUE
  COMMENT 'UID kartu RFID RC522 (hex), opsional'
  AFTER `nomor_telepon`;

-- Index untuk pencarian cepat by rfid_uid
ALTER TABLE `children`
  ADD INDEX `idx_rfid_uid` (`rfid_uid`);
