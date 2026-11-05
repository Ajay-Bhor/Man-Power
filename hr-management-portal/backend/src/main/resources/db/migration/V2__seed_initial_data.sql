-- ==============================================================================
-- Flyway Migration: V2__seed_initial_data.sql
-- Description: Seed initial roles, departments, users, requisitions, and recruitment data
-- ==============================================================================

SET NAMES utf8mb4;

-- 1. Insert Core Roles
INSERT INTO roles (id, role_name, description) VALUES
(1, 'ROLE_IT_ADMIN', 'System administrator with user, backup and security configuration privileges'),
(2, 'ROLE_HR_ADMIN', 'HR Department Administrator with full requisition, employee, and pipeline access'),
(3, 'ROLE_HR_RECRUITER', 'Recruiter managing assigned requisitions, candidate sourcing, and interviews'),
(4, 'ROLE_DEPT_HEAD', 'Department Head with requisition creation and department approval oversight'),
(5, 'ROLE_APPROVING_MANAGER', 'Line manager authorized to approve, return or reject manpower requisitions'),
(6, 'ROLE_SENIOR_MGMT', 'Senior leadership for final capital/headcount sanction and strategic analytics'),
(7, 'ROLE_INTERVIEWER', 'Panelist conducting technical/managerial interviews and submitting ratings'),
(8, 'ROLE_EMPLOYEE', 'Standard employee with document access and internal requisition requests')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 2. Insert Departments
INSERT INTO departments (id, department_code, department_name, active) VALUES
(1, 'DEP-ENG', 'Engineering & Technology', TRUE),
(2, 'DEP-SALES', 'Global Sales & Enterprise BD', TRUE),
(3, 'DEP-HR', 'Human Resources & Talent Acquisition', TRUE),
(4, 'DEP-FIN', 'Finance, Tax & Accounts', TRUE),
(5, 'DEP-OPS', 'Operations & Supply Chain', TRUE),
(6, 'DEP-MKT', 'Brand Marketing & Communications', TRUE)
ON DUPLICATE KEY UPDATE active=VALUES(active);

-- 3. Insert Designations
INSERT INTO designations (id, designation_code, designation_name, department_id, level, active) VALUES
(1, 'DES-ENG-01', 'Principal Cloud Architect', 1, 'Senior Lead', TRUE),
(2, 'DES-ENG-02', 'Senior Full Stack Java Engineer', 1, 'Senior', TRUE),
(3, 'DES-ENG-03', 'Frontend React Developer', 1, 'Mid-Level', TRUE),
(4, 'DES-ENG-04', 'QA Automation Engineer', 1, 'Mid-Level', TRUE),
(5, 'DES-SAL-01', 'Enterprise Sales Director', 2, 'Director', TRUE),
(6, 'DES-SAL-02', 'Business Development Executive', 2, 'Junior-Mid', TRUE),
(7, 'DES-HR-01', 'Talent Acquisition Lead', 3, 'Lead', TRUE),
(8, 'DES-HR-02', 'Senior Technical Recruiter', 3, 'Mid-Level', TRUE),
(9, 'DES-FIN-01', 'Financial Controller', 4, 'Senior Lead', TRUE),
(10, 'DES-OPS-01', 'Operations Manager', 5, 'Management', TRUE)
ON DUPLICATE KEY UPDATE active=VALUES(active);

-- 4. Insert Default Users (BCrypt Hash for 'password')
INSERT INTO users (id, username, name, email, password_hash, status, phone_number) VALUES
(1, 'itadmin', 'Vikramaditya Sharma', 'admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 11223'),
(2, 'hradmin', 'Priyanka Sen', 'hradmin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 22334'),
(3, 'recruiter.anita', 'Anita Deshmukh', 'anita.recruiter@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 33445'),
(4, 'recruiter.rahul', 'Rahul Nair', 'rahul.recruiter@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 44556'),
(5, 'depthead.eng', 'Rajesh Kulkarni', 'rajesh.eng@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 55667'),
(6, 'manager.amit', 'Amitav Mukherjee', 'amitav.mgr@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 66778'),
(7, 'senior.mehta', 'Siddharth Mehta (VP)', 'smehta.vp@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 77889'),
(8, 'interviewer.dev', 'Arjun Varma (Tech Lead)', 'arjun.tech@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', '+91 98200 88990')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 5. User Roles Mapping
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- Vikramaditya -> IT Admin
(2, 2), -- Priyanka -> HR Admin
(3, 3), -- Anita -> HR Recruiter
(4, 3), -- Rahul -> HR Recruiter
(5, 4), -- Rajesh -> Dept Head
(6, 5), -- Amitav -> Approving Manager
(7, 6), -- Siddharth -> Senior Mgmt
(8, 7), -- Arjun -> Interviewer
(8, 8)  -- Arjun -> Employee
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

-- Update Head of Department
UPDATE departments SET head_user_id = 5 WHERE id = 1; -- Rajesh -> Eng Dept Head
UPDATE departments SET head_user_id = 2 WHERE id = 3; -- Priyanka -> HR Dept Head

-- 6. Insert Employees
INSERT INTO employees (id, employee_code, name, email, phone_number, department_id, designation_id, reporting_manager_id, joining_date, employment_type, status, work_location) VALUES
(1, 'EMP-1001', 'Rajesh Kulkarni', 'rajesh.eng@company.com', '+91 98200 55667', 1, 1, NULL, '2021-03-15', 'FULL_TIME', 'ACTIVE', 'Bangalore HQ'),
(2, 'EMP-1002', 'Arjun Varma', 'arjun.tech@company.com', '+91 98200 88990', 1, 2, 1, '2022-06-01', 'FULL_TIME', 'ACTIVE', 'Bangalore HQ'),
(3, 'EMP-1003', 'Anita Deshmukh', 'anita.recruiter@company.com', '+91 98200 33445', 3, 8, NULL, '2023-01-10', 'FULL_TIME', 'ACTIVE', 'Mumbai Office'),
(4, 'EMP-1004', 'Rahul Nair', 'rahul.recruiter@company.com', '+91 98200 44556', 3, 8, NULL, '2023-04-18', 'FULL_TIME', 'ACTIVE', 'Pune Office')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 7. Insert Requisitions with TAT milestones (Assuming current date is ~Oct 2026)
INSERT INTO requisitions (
    id, requisition_code, job_title, department_id, designation_id,
    headcount, position_type, priority, experience_years_min, experience_years_max,
    min_budget, max_budget, job_description, justification, status,
    created_by, assigned_recruiter_id, tat_start_date, tat_target_days, due_date
) VALUES
(1, 'REQ-2026-001', 'Senior Full Stack Java Engineer', 1, 2, 2, 'NEW_HEADCOUNT', 'CRITICAL', 5, 8, 1800000.00, 2400000.00,
 'Core backend services in Spring Boot 3 with high throughput and React UI dashboard integration.',
 'Headcount expansion for upcoming Cloud Migration & Banking Integration client portfolio.',
 'INTERVIEWING', 5, 3, '2026-10-01', 30, '2026-10-31'),

(2, 'REQ-2026-002', 'Frontend React Developer', 1, 3, 1, 'REPLACEMENT', 'HIGH', 3, 5, 1200000.00, 1600000.00,
 'Modern responsive UI development, component architecture, state management and CSS styling.',
 'Replacement for departing senior UI contributor to maintain sprint delivery cadence.',
 'SOURCING', 5, 4, '2026-10-10', 30, '2026-11-09'),

(3, 'REQ-2026-003', 'Enterprise Sales Director', 2, 5, 1, 'NEW_HEADCOUNT', 'HIGH', 10, 15, 3200000.00, 4500000.00,
 'Leading enterprise SaaS customer acquisitions, client relations and revenue forecasting across APAC.',
 'Entering new Southeast Asia enterprise vertical in Q1 2027.',
 'PENDING_DEPT_APPROVAL', 6, NULL, NULL, 30, NULL),

(4, 'REQ-2026-004', 'QA Automation Engineer', 1, 4, 1, 'NEW_HEADCOUNT', 'MEDIUM', 3, 6, 1100000.00, 1500000.00,
 'Playwright and Selenium framework automation with CI/CD integration.',
 'Strengthening test coverage for automated release pipeline.',
 'APPROVED', 5, NULL, NULL, 30, NULL),

(5, 'REQ-2026-005', 'Financial Controller', 4, 9, 1, 'REPLACEMENT', 'CRITICAL', 8, 12, 2500000.00, 3200000.00,
 'Internal controls, statutory auditing, GAAP/IFRS financial statements, tax strategy.',
 'Critical replacement due to internal retirement.',
 'RECRUITER_ASSIGNED', 6, 3, '2026-09-20', 30, '2026-10-20') -- This one is overdue (>30 days) to demonstrate TAT alerts!
ON DUPLICATE KEY UPDATE job_title=VALUES(job_title);

-- 8. Requisition Approvals history
INSERT INTO requisition_approvals (requisition_id, approval_stage, approver_id, decision, remarks, decision_date) VALUES
(1, 'HR_REVIEW', 2, 'APPROVED', 'Budget aligned with HR market benchmarking. Headcount validated.', '2026-09-28 11:30:00'),
(1, 'MANAGER_APPROVAL', 6, 'APPROVED', 'Urgent business requirement for Q4 delivery deliverables.', '2026-09-29 16:15:00'),
(1, 'SENIOR_APPROVAL', 7, 'APPROVED', 'Executive sign-off granted for 2 headcounts.', '2026-09-30 14:00:00'),
(5, 'HR_REVIEW', 2, 'APPROVED', 'Replacement for retired controller. Priority high.', '2026-09-18 10:00:00'),
(5, 'MANAGER_APPROVAL', 6, 'APPROVED', 'Approved for immediate recruitment.', '2026-09-19 12:00:00'),
(5, 'SENIOR_APPROVAL', 7, 'APPROVED', 'Approved by VP.', '2026-09-20 09:30:00');

-- 9. Insert Candidates
INSERT INTO candidates (
    id, candidate_code, name, email, mobile, experience_years, current_employer,
    current_designation, current_ctc, expected_ctc, notice_period_days, primary_skills, source, requisition_id, status
) VALUES
(1, 'CAN-2026-101', 'Rohan Mathur', 'rohan.mathur@email.com', '+91 99887 66554', 6.5, 'Infosys Ltd',
 'Senior Software Engineer', 1650000.00, 2100000.00, 30, 'Java 21, Spring Boot, MySQL, Kafka, Microservices', 'LINKEDIN', 1, 'INTERVIEW_SCHEDULED'),

(2, 'CAN-2026-102', 'Sneha Patel', 'sneha.patel@email.com', '+91 99887 11223', 7.0, 'Wipro Technologies',
 'Technical Specialist', 1700000.00, 2250000.00, 60, 'Spring Cloud, Hibernate, REST APIs, Docker, AWS', 'NAUKRI', 1, 'SHORTLISTED'),

(3, 'CAN-2026-103', 'Kunal Sengupta', 'kunal.sengupta@email.com', '+91 99887 33445', 4.0, 'Cognizant',
 'UI Engineer', 1100000.00, 1450000.00, 15, 'React.js, TypeScript, Redux Toolkit, Tailwind, Bootstrap 5', 'REFERRAL', 2, 'SCREENING'),

(4, 'CAN-2026-104', 'Deepika Rao', 'deepika.rao@email.com', '+91 99887 55667', 9.5, 'Deloitte Consulting',
 'Assistant Manager - Finance', 2400000.00, 2900000.00, 45, 'CA, Statutory Audit, SAP FI/CO, US GAAP', 'HEADHUNTER', 5, 'INTERVIEW_SCHEDULED')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 10. Insert Interviews
INSERT INTO interviews (id, candidate_id, requisition_id, round, interviewer_id, scheduled_at, duration_minutes, meeting_link, status) VALUES
(1, 1, 1, 'TECHNICAL_R1', 8, '2026-10-23 15:00:00', 60, 'https://teams.microsoft.com/l/meetup-join/123456789', 'SCHEDULED'),
(2, 4, 5, 'MANAGERIAL', 6, '2026-10-24 11:30:00', 45, 'https://teams.microsoft.com/l/meetup-join/987654321', 'SCHEDULED')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 11. Initial Audit Log
INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, new_value, ip_address) VALUES
(1, 'Vikramaditya Sharma', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'BOOTSTRAP', '{"version": "1.0.0", "status": "READY"}', '127.0.0.1');

-- 12. Initial Backup Record
INSERT INTO backup_history (backup_type, status, file_name, file_size_bytes, location_reference, checksum_hash, initiated_by, completed_at) VALUES
(1, 'SUCCESS', 'db_backup_full_20261021_0200.sql.gz', 14589200, 's3://hr-portal-secure-backups/daily/db_backup_full_20261021_0200.sql.gz', 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 1, '2026-10-21 02:04:12');
