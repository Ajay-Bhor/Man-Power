-- ==============================================================================
-- Flyway Migration V9: HR Task Assignments & Separate User Management System
-- Urja Foods ATS - Applicant Tracking System
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Alter recruitment_tasks table to support full recruitment task lifecycle
ALTER TABLE recruitment_tasks MODIFY requisition_id BIGINT NULL;

ALTER TABLE recruitment_tasks 
    ADD COLUMN candidate_id BIGINT NULL AFTER requisition_id,
    ADD COLUMN assigned_by_user_id BIGINT NULL AFTER assigned_user_id,
    ADD COLUMN task_type VARCHAR(50) NOT NULL DEFAULT 'OTHER' AFTER task_title,
    ADD COLUMN start_date DATE NULL AFTER due_date,
    ADD COLUMN comments TEXT NULL AFTER task_description;

ALTER TABLE recruitment_tasks
    ADD CONSTRAINT fk_task_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_task_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE recruitment_tasks MODIFY status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED';
ALTER TABLE recruitment_tasks MODIFY priority VARCHAR(30) NOT NULL DEFAULT 'MEDIUM';

-- Update existing tasks with sensible task_type and assigned_by
UPDATE recruitment_tasks 
SET task_type = CASE 
    WHEN task_title LIKE '%Interview%' THEN 'INTERVIEW_FEEDBACK'
    WHEN task_title LIKE '%Source%' THEN 'CANDIDATE_SCREENING'
    WHEN task_title LIKE '%Screen%' THEN 'CANDIDATE_SCREENING'
    WHEN task_title LIKE '%Offer%' THEN 'OFFER_PROCESSING'
    WHEN task_title LIKE '%Approve%' THEN 'REQUISITION_REVIEW'
    ELSE 'OTHER'
END,
assigned_by_user_id = 2,
start_date = DATE_SUB(due_date, INTERVAL 3 DAY)
WHERE task_type = 'OTHER';

-- 2. Ensure an inactive user account exists for validation testing (Sunil Verma - Inactive Recruiter)
INSERT INTO users (username, name, email, password_hash, status, department_restriction_id, phone_number, created_at, updated_at)
SELECT 'sunil.recruiter', 'Sunil Verma', 'sunil.verma@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'INACTIVE', 1, '+91 98220 99887', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sunil.verma@company.com');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'sunil.verma@company.com' AND r.role_name = 'ROLE_HR_RECRUITER'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN users u2 ON ur.user_id = u2.id 
    JOIN roles r2 ON ur.role_id = r2.id 
    WHERE u2.email = 'sunil.verma@company.com' AND r2.role_name = 'ROLE_HR_RECRUITER'
);

-- 3. Seed realistic task assignments for synthetic accounts
-- Anita Deshmukh (id: 3, Recruiter)
INSERT INTO recruitment_tasks (requisition_id, candidate_id, assigned_user_id, assigned_by_user_id, task_title, task_type, task_description, comments, start_date, due_date, status, priority)
VALUES
(1, 1, 3, 2, 'Screen Senior Full Stack Java Resumes', 'CANDIDATE_SCREENING', 'Evaluate inbound candidates for Java 21, Spring Boot 3, and microservices experience.', 'Target shortlist of 5 candidates by Tuesday.', '2026-10-24', '2026-10-28', 'IN_PROGRESS', 'HIGH'),
(1, 1, 3, 2, 'Coordinate Technical R2 Interview for Rohan Mathur', 'INTERVIEW_COORDINATION', 'Schedule 60-min round with Arjun Varma and send calendar invite with Google Meet link.', 'Candidate preferred afternoon slots.', '2026-10-25', '2026-10-28', 'ASSIGNED', 'MEDIUM'),
(1, 2, 3, 2, 'Draft Offer Letter & Compensation Breakdown for Sneha Patel', 'OFFER_PROCESSING', 'Prepare offer documentation based on approved CTC package of 18.5 LPA.', 'Awaiting manager signoff.', '2026-10-25', '2026-10-29', 'ASSIGNED', 'URGENT'),
(NULL, NULL, 3, 2, 'Verify Onboarding Checklists for Q4 Engineering Joinees', 'ONBOARDING_FOLLOW_UP', 'Review submitted educational certificates, Aadhaar, PAN, and bank accounts for newly confirmed engineers.', 'Initial verification complete.', '2026-10-23', '2026-10-31', 'IN_PROGRESS', 'LOW');

-- Rahul Nair (id: 4, Recruiter)
INSERT INTO recruitment_tasks (requisition_id, candidate_id, assigned_user_id, assigned_by_user_id, task_title, task_type, task_description, comments, start_date, due_date, status, priority)
VALUES
(2, 3, 4, 2, 'Source Frontend React Developers on LinkedIn Recruiter', 'CANDIDATE_SCREENING', 'Reach out to experienced Frontend Engineers with React, TypeScript, and state management skills.', 'Sourced 8 profiles so far.', '2026-10-24', '2026-10-28', 'IN_PROGRESS', 'HIGH'),
(5, 4, 4, 2, 'Background Check Follow-up for Deepika Rao', 'ONBOARDING_FOLLOW_UP', 'Coordinate with Third-Party Agency for past employment and address verification.', 'Report received with clean status.', '2026-10-22', '2026-10-26', 'COMPLETED', 'MEDIUM');

-- Arjun Varma (id: 8, Interviewer)
INSERT INTO recruitment_tasks (requisition_id, candidate_id, assigned_user_id, assigned_by_user_id, task_title, task_type, task_description, comments, start_date, due_date, status, priority)
VALUES
(1, 1, 8, 2, 'Submit Technical R2 Architecture Scorecard for Rohan Mathur', 'INTERVIEW_FEEDBACK', 'Evaluate system design, Kafka messaging patterns, and concurrency benchmarks.', 'Interview concluded, pending scorecard submission.', '2026-10-26', '2026-10-27', 'ASSIGNED', 'URGENT'),
(1, 2, 8, 2, 'Conduct Coding Assessment Review for Sneha Patel', 'INTERVIEW_FEEDBACK', 'Code walkthrough on data structure implementation and unit test coverage.', 'Strong candidate, recommended for hire.', '2026-10-24', '2026-10-26', 'COMPLETED', 'HIGH');

-- Kavita Rao (id: 10, Interviewer)
INSERT INTO recruitment_tasks (requisition_id, candidate_id, assigned_user_id, assigned_by_user_id, task_title, task_type, task_description, comments, start_date, due_date, status, priority)
VALUES
(2, 3, 10, 2, 'Conduct React Core & State Management Evaluation for Kunal Sengupta', 'INTERVIEW_FEEDBACK', 'Test proficiency in React 18 hooks, rendering performance, and REST API integration.', 'Scheduled for 11:30 AM.', '2026-10-26', '2026-10-29', 'ASSIGNED', 'HIGH');

-- Priyanka Deshmukh (id: 2, HR Admin)
INSERT INTO recruitment_tasks (requisition_id, candidate_id, assigned_user_id, assigned_by_user_id, task_title, task_type, task_description, comments, start_date, due_date, status, priority)
VALUES
(1, NULL, 2, 2, 'Quarterly Requisition Budget & SLA Review for Tech Hiring', 'REQUISITION_REVIEW', 'Audit time-to-hire metrics, vacancy aging, and external agency spends across open tech roles.', 'Reviewing hiring funnel metrics.', '2026-10-25', '2026-10-30', 'IN_PROGRESS', 'HIGH'),
(5, 4, 2, 2, 'Final Signoff on Financial Controller Compensation Package', 'OFFER_PROCESSING', 'Cross-check banding against company salary grid and senior management guidelines.', 'Pending VP approval.', '2026-10-26', '2026-10-29', 'ASSIGNED', 'URGENT');

SET FOREIGN_KEY_CHECKS = 1;
