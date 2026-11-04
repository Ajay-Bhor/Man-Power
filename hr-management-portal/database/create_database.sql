-- ==============================================================================
-- TalentPulse HR Portal - Database Creation Script
-- Target: MySQL 8.x
-- ==============================================================================

-- 1. Create Database with full Unicode UTF-8 support
CREATE DATABASE IF NOT EXISTS hr_portal_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Verify Database
USE hr_portal_db;
SELECT DATABASE() AS current_database, @@character_set_database AS charset, @@collation_database AS collation;

-- 3. (Optional) Create dedicated application user if preferred
-- CREATE USER IF NOT EXISTS 'hr_user'@'localhost' IDENTIFIED BY 'HrPass@2026';
-- GRANT ALL PRIVILEGES ON hr_portal_db.* TO 'hr_user'@'localhost';
-- FLUSH PRIVILEGES;
