-- One-time local MySQL setup. Run as the MySQL root user, e.g.:
--   mysql -u root -p < database/scripts/setup-local-database.sql
-- Then put the SAME password in database/.env as DB_PASSWORD.
-- Replace CHANGE_ME_STRONG_PASSWORD below before running.

CREATE DATABASE IF NOT EXISTS realestate_dev
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'realestate_app'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
ALTER USER 'realestate_app'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON realestate_dev.* TO 'realestate_app'@'localhost';
FLUSH PRIVILEGES;
