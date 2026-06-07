-- =====================================================
-- Migration: 007_add_rfid_to_children.sql
-- Deskripsi: Menambah kolom rfid_uid ke tabel children
-- Aplikasi: PENTING (Pencegahan Stunting Terintegrasi)
-- Tanggal: 2026-06-07
-- =====================================================
-- rfid_uid: UID kartu RFID RC522, format hex string
--           (misal: A3B4C5D6 atau A3:B4:C5:D6)
--           Bersifat opsional (NULL) dan unik
-- =====================================================

ALTER TABLE `children`
  ADD COLUMN `rfid_uid` VARCHAR(20) NULL UNIQUE
  COMMENT 'UID kartu RFID RC522 (hex), opsional'
  AFTER `nomor_telepon`;

-- Index untuk pencarian cepat by rfid_uid
ALTER TABLE `children`
  ADD INDEX `idx_rfid_uid` (`rfid_uid`);
