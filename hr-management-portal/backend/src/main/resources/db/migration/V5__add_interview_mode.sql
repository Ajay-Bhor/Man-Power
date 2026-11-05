-- ==============================================================================
-- Flyway Migration: V5__add_interview_mode.sql
-- Description: Add interview mode column to interviews table
-- ==============================================================================

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'interviews' 
      AND COLUMN_NAME = 'mode'
);

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN mode VARCHAR(30) NOT NULL DEFAULT ''ONLINE'' AFTER duration_minutes', 
    'SELECT 1'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing records mode based on meeting_location / meeting_link
UPDATE interviews 
SET mode = 'TELEPHONIC' 
WHERE meeting_location LIKE '%telephon%' OR meeting_location LIKE '%phone%';

UPDATE interviews 
SET mode = 'IN_PERSON' 
WHERE (meeting_location LIKE '%Plant%' OR meeting_location LIKE '%HO%' OR meeting_location LIKE '%Office%' OR meeting_location LIKE '%Pune%' OR meeting_location LIKE '%Nashik%' OR meeting_location LIKE '%Rahuri%' OR meeting_location LIKE '%Solapur%')
  AND (meeting_link IS NULL OR meeting_link = '');
