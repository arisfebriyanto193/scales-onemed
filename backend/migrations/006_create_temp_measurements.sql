CREATE TABLE IF NOT EXISTS `temp_measurements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dev_id` varchar(100) NOT NULL,
  `bb` decimal(5,2) NOT NULL,
  `tb` decimal(5,2) NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dev_id` (`dev_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
