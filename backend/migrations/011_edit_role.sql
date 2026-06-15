ALTER TABLE users
MODIFY COLUMN role ENUM('admin','kader')
NOT NULL DEFAULT 'kader';