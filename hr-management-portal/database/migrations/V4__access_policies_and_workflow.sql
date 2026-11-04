-- ==============================================================================
-- Flyway Migration: V4__access_policies_and_workflow.sql
-- Description: Access policies, interview instructions, and workflow tracking
-- ==============================================================================

SET NAMES utf8mb4;

-- 1. Create Access Policies Table
CREATE TABLE IF NOT EXISTS access_policies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    policy_key VARCHAR(100) NOT NULL UNIQUE,
    policy_value VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_access_policy_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed Default Access Policies
INSERT INTO access_policies (policy_key, policy_value, description) VALUES
('it_admin_candidate_access', 'false', 'Allow IT Administrator to view candidate records'),
('it_admin_resume_access', 'false', 'Allow IT Administrator to download/view candidate resumes'),
('it_admin_feedback_access', 'false', 'Allow IT Administrator to view interviewer ratings and scorecards'),
('can_assign_recruiters', 'ROLE_HR_ADMIN', 'Roles authorized to assign recruiters to requisitions'),
('can_assign_interviewers', 'ROLE_HR_ADMIN', 'Roles authorized to schedule rounds and assign interviewers'),
('can_assign_approvers', 'ROLE_HR_ADMIN,ROLE_DEPT_HEAD', 'Roles authorized to configure requisition approval workflows')
ON DUPLICATE KEY UPDATE policy_value=VALUES(policy_value), description=VALUES(description);

-- 3. Add instructions and criteria column to interviews if not exists
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'interviews' 
      AND COLUMN_NAME = 'instructions'
);

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN instructions TEXT NULL AFTER meeting_location', 
    'SELECT 1'
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Ensure Arjun Varma (id=8) has an assigned interview and pending task
INSERT INTO interviews (id, candidate_id, requisition_id, round, interviewer_id, scheduled_at, duration_minutes, meeting_link, meeting_location, instructions, status)
VALUES (1, 1, 1, 'TECHNICAL_R1', 8, '2026-10-24 14:00:00', 60, 'https://teams.microsoft.com/l/meetup-join/123456789', 'Online MS Teams', 'Evaluate Java 21, Spring Boot 3 architecture, concurrency and problem solving skills.', 'SCHEDULED')
ON DUPLICATE KEY UPDATE 
    interviewer_id = 8, 
    scheduled_at = '2026-10-24 14:00:00',
    instructions = 'Evaluate Java 21, Spring Boot 3 architecture, concurrency and problem solving skills.',
    status = 'SCHEDULED';

-- 5. Insert initial recruitment task for Arjun's assigned interview
INSERT INTO recruitment_tasks (id, requisition_id, assigned_user_id, task_title, task_description, due_date, status, priority)
VALUES (1, 1, 8, 'Conduct Technical R1 Interview – Rohan Mathur', 'Evaluate candidate for Senior Full Stack Java Engineer. Complete and submit feedback scorecard.', '2026-10-24', 'PENDING', 'HIGH')
ON DUPLICATE KEY UPDATE 
    assigned_user_id = 8,
    status = 'PENDING';

-- 6. Insert initial recruitment task for Anita's assigned requisition
INSERT INTO recruitment_tasks (id, requisition_id, assigned_user_id, task_title, task_description, due_date, status, priority)
VALUES (2, 1, 3, 'Source 5 Java 21 Candidates – REQ-2026-001', 'Active sourcing on LinkedIn and Naukri for Senior Full Stack Java Engineer.', '2026-10-26', 'PENDING', 'MEDIUM')
ON DUPLICATE KEY UPDATE
    assigned_user_id = 3,
    status = 'PENDING';
