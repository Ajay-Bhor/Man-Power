-- ==============================================================================
-- Flyway Migration: V8__employee_lifecycle.sql
-- Description: Expand employees schema for complete lifecycle management,
--              status history audit trail, and ATS-recruited employee records
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Modify employees table to add lifecycle, probation, exit and ATS recruitment fields
ALTER TABLE employees
    ADD COLUMN candidate_id BIGINT NULL AFTER id,
    ADD COLUMN offer_id BIGINT NULL AFTER candidate_id,
    ADD COLUMN avatar_url VARCHAR(500) NULL AFTER name,
    ADD COLUMN gender VARCHAR(20) NULL DEFAULT 'Not Set' AFTER phone_number,
    ADD COLUMN date_of_birth DATE NULL AFTER gender,
    ADD COLUMN blood_group VARCHAR(10) NULL DEFAULT 'Not Set' AFTER date_of_birth,
    ADD COLUMN marital_status VARCHAR(30) NULL DEFAULT 'Not Set' AFTER blood_group,
    ADD COLUMN address VARCHAR(255) NULL AFTER marital_status,
    ADD COLUMN reporting_manager_name VARCHAR(150) NULL AFTER reporting_manager_id,
    ADD COLUMN probation_duration_months INT NULL DEFAULT 6 AFTER employment_type,
    ADD COLUMN probation_end_date DATE NULL AFTER probation_duration_months,
    ADD COLUMN confirmation_status ENUM('CONFIRMED', 'PENDING_REVIEW', 'EXTENDED', 'NOT_APPLICABLE') NOT NULL DEFAULT 'PENDING_REVIEW' AFTER probation_end_date,
    ADD COLUMN confirmation_date DATE NULL AFTER confirmation_status,
    ADD COLUMN resignation_date DATE NULL AFTER confirmation_date,
    ADD COLUMN notice_period_days INT NULL DEFAULT 30 AFTER resignation_date,
    ADD COLUMN last_working_day DATE NULL AFTER notice_period_days,
    ADD COLUMN actual_exit_date DATE NULL AFTER last_working_day,
    ADD COLUMN exit_reason TEXT NULL AFTER actual_exit_date,
    ADD COLUMN exit_checklist_status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_STARTED' AFTER exit_reason;

-- Update status column ENUM to support all required lifecycle states
ALTER TABLE employees 
    MODIFY COLUMN status ENUM('ON_PROBATION', 'ACTIVE', 'RESIGNATION_SUBMITTED', 'NOTICE_PERIOD', 'EXITED', 'TERMINATED') NOT NULL DEFAULT 'ON_PROBATION';

-- Add Foreign Key Constraints
ALTER TABLE employees ADD CONSTRAINT fk_employees_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL;
ALTER TABLE employees ADD CONSTRAINT fk_employees_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;

-- 2. Create Employee Status History Table for Auditing Lifecycle Transitions
CREATE TABLE IF NOT EXISTS employee_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    change_reason TEXT NULL,
    changed_by_user_id BIGINT NULL,
    changed_by_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp_history_employee (employee_id),
    CONSTRAINT fk_emp_history_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed / Update ATS-recruited employees
-- Ensure clean seed data matching the reference screenshot and requirements:
-- UF0012: Amit Patil (Active / Confirmed)
-- UF0013: Neha Joshi (Active / Confirmed)
-- UF0014: Rahul More (Active / Confirmed)
-- UF0015: Sneha Shah (Active / Confirmed)
-- UF0016: Vikram Desai (On Probation)
-- UF0017: Anita Kulkarni (Active / Confirmed)
-- UF0018: Sandeep Jadhav (Active / Confirmed)
-- UF0019: Pooja Khot (Active / Confirmed)
-- UF0020: Rohit Shinde (Resigned / Exited)
-- UF0021: Akshay Mane (Active / Confirmed)
-- UF0022: Ganesh Jadhav (Confirmation Due / Near Probation End)
-- UF0023: Sunita Mane (Resignation Submitted)
-- UF0024: Meena Kulkarni (Notice Period)
-- UF0025: Priya Kadam (Missing / Pending Probation Details)

DELETE FROM employee_status_history WHERE employee_id > 0;
DELETE FROM employees WHERE id >= 10;

INSERT INTO employees (
    id, candidate_id, offer_id, employee_code, name, email, avatar_url, phone_number,
    gender, date_of_birth, blood_group, marital_status, address,
    department_id, designation_id, reporting_manager_name, joining_date, employment_type,
    probation_duration_months, probation_end_date, confirmation_status, confirmation_date,
    resignation_date, notice_period_days, last_working_day, actual_exit_date, exit_reason, exit_checklist_status,
    status, work_location
) VALUES
-- 1. Amit Patil (Screenshot Row 1 & Details Panel)
(10, 101, 1, 'UF0012', 'Amit Patil', 'amit.patil@urjafoods.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+91 98765 43210',
 'Male', '1998-07-15', 'O+', 'Single', 'Pune, Maharashtra',
 1, 2, 'Priyanka Deshmukh', '2024-11-01', 'FULL_TIME',
 6, '2025-04-30', 'CONFIRMED', '2025-04-28',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Pune'),

-- 2. Neha Joshi (Screenshot Row 2)
(11, 102, 2, 'UF0013', 'Neha Joshi', 'neha.joshi@urjafoods.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '+91 98221 44552',
 'Female', '1996-03-22', 'B+', 'Married', 'Mumbai, Maharashtra',
 3, 7, 'Priyanka Deshmukh', '2024-08-12', 'FULL_TIME',
 6, '2025-02-12', 'CONFIRMED', '2025-02-10',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Mumbai'),

-- 3. Rahul More (Screenshot Row 3)
(12, 103, 3, 'UF0014', 'Rahul More', 'rahul.more@urjafoods.com', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '+91 98221 44553',
 'Male', '1995-11-09', 'A+', 'Single', 'Pune, Maharashtra',
 1, 4, 'Rajesh Kulkarni', '2024-01-05', 'FULL_TIME',
 6, '2024-07-05', 'CONFIRMED', '2024-07-01',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Pune'),

-- 4. Sneha Shah (Screenshot Row 4)
(13, 104, 4, 'UF0015', 'Sneha Shah', 'sneha.shah@urjafoods.com', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', '+91 98221 44554',
 'Female', '1997-05-18', 'AB+', 'Married', 'Shirdi, Maharashtra',
 5, 10, 'Sanjay Patil', '2024-03-18', 'FULL_TIME',
 6, '2024-09-18', 'CONFIRMED', '2024-09-15',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Shirdi'),

-- 5. Vikram Desai (Screenshot Row 5 - On Probation)
(14, 105, 5, 'UF0016', 'Vikram Desai', 'vikram.desai@urjafoods.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '+91 98221 44555',
 'Male', '1999-01-30', 'O-', 'Single', 'Rahuri, Maharashtra',
 5, 10, 'Sandeep Jadhav', '2024-06-10', 'FULL_TIME',
 6, '2026-12-10', 'PENDING_REVIEW', NULL,
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ON_PROBATION', 'Rahuri'),

-- 6. Anita Kulkarni (Screenshot Row 6)
(15, 106, 6, 'UF0017', 'Anita Kulkarni', 'anita.kulkarni@urjafoods.com', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', '+91 98221 44556',
 'Female', '1994-09-14', 'B+', 'Single', 'Pune, Maharashtra',
 4, 9, 'Amitav Mukherjee', '2024-07-22', 'FULL_TIME',
 6, '2025-01-22', 'CONFIRMED', '2025-01-20',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Pune'),

-- 7. Sandeep Jadhav (Screenshot Row 7)
(16, 107, 7, 'UF0018', 'Sandeep Jadhav', 'sandeep.jadhav@urjafoods.com', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', '+91 98221 44557',
 'Male', '1992-12-05', 'A-', 'Married', 'Rahuri, Maharashtra',
 5, 10, 'Sanjay Patil', '2024-02-14', 'FULL_TIME',
 6, '2024-08-14', 'CONFIRMED', '2024-08-10',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Rahuri'),

-- 8. Pooja Khot (Screenshot Row 8)
(17, 108, 8, 'UF0019', 'Pooja Khot', 'pooja.khot@urjafoods.com', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', '+91 98221 44558',
 'Female', '1998-04-11', 'O+', 'Single', 'Mumbai, Maharashtra',
 2, 6, 'Nitin Pawar', '2025-10-01', 'FULL_TIME',
 6, '2026-04-01', 'CONFIRMED', '2026-03-28',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Mumbai'),

-- 9. Rohit Shinde (Screenshot Row 9 - Resigned / Exited)
(18, 109, 9, 'UF0020', 'Rohit Shinde', 'rohit.shinde@urjafoods.com', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', '+91 98221 44559',
 'Male', '1993-08-25', 'B-', 'Married', 'Pune, Maharashtra',
 5, 10, 'Rajesh Kulkarni', '2023-09-17', 'FULL_TIME',
 6, '2024-03-17', 'CONFIRMED', '2024-03-15',
 '2026-08-01', 30, '2026-08-31', '2026-08-31', 'Relocating to native hometown for family business.', 'COMPLETED',
 'EXITED', 'Pune'),

-- 10. Akshay Mane (Screenshot Row 10 - New Joiner / Active)
(19, 110, 10, 'UF0021', 'Akshay Mane', 'akshay.mane@urjafoods.com', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', '+91 98221 44560',
 'Male', '2000-02-17', 'AB+', 'Single', 'Pune, Maharashtra',
 1, 3, 'Priyanka Deshmukh', '2026-10-03', 'FULL_TIME',
 6, '2027-04-03', 'CONFIRMED', '2026-10-24',
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ACTIVE', 'Pune'),

-- 11. Ganesh Jadhav (Test Case 3: Approaching Probation End / Confirmation Due)
(20, 111, 11, 'UF0022', 'Ganesh Jadhav', 'ganesh.jadhav@urjafoods.com', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '+91 98221 44561',
 'Male', '1997-10-12', 'A+', 'Single', 'Nashik, Maharashtra',
 5, 10, 'Suresh Deshmukh', '2026-04-20', 'FULL_TIME',
 6, '2026-10-20', 'PENDING_REVIEW', NULL,
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ON_PROBATION', 'Nashik'),

-- 12. Sunita Mane (Test Case 4: Resignation Submitted while still working)
(21, 122, 20, 'UF0023', 'Sunita Mane', 'sunita.mane@urjafoods.com', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150', '+91 98221 44562',
 'Female', '1996-06-19', 'O+', 'Married', 'Pune, Maharashtra',
 2, 6, 'Nitin Pawar', '2025-05-15', 'FULL_TIME',
 6, '2025-11-15', 'CONFIRMED', '2025-11-10',
 '2026-10-22', 30, '2026-11-21', NULL, 'Pursuing higher education / MBA.', 'IN_PROGRESS',
 'RESIGNATION_SUBMITTED', 'Pune'),

-- 13. Meena Kulkarni (Test Case 5: Notice Period)
(22, 114, 12, 'UF0024', 'Meena Kulkarni', 'meena.kulkarni@urjafoods.com', 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150', '+91 98221 44563',
 'Female', '1994-11-28', 'B+', 'Single', 'Baramati, Maharashtra',
 4, 9, 'Amitav Mukherjee', '2024-04-10', 'FULL_TIME',
 6, '2024-10-10', 'CONFIRMED', '2024-10-05',
 '2026-10-01', 30, '2026-10-31', NULL, 'Career transition to agro finance advisory.', 'IN_PROGRESS',
 'NOTICE_PERIOD', 'Baramati'),

-- 14. Priya Kadam (Test Case 7: Missing / Pending Probation Details)
(23, 110, 8, 'UF0025', 'Priya Kadam', 'priya.kadam@urjafoods.com', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', '+91 98221 44564',
 'Female', '1999-07-08', 'A+', 'Single', 'Pune, Maharashtra',
 1, 4, 'Rajesh Kulkarni', '2026-10-15', 'FULL_TIME',
 NULL, NULL, 'PENDING_REVIEW', NULL,
 NULL, 30, NULL, NULL, NULL, 'NOT_APPLICABLE',
 'ON_PROBATION', 'Pune');

-- Insert initial status transition history entries
INSERT INTO employee_status_history (employee_id, previous_status, new_status, change_reason, changed_by_user_id, changed_by_name) VALUES
(10, 'ON_PROBATION', 'ACTIVE', 'Probation successfully completed with exceptional performance rating.', 2, 'Priyanka Deshmukh'),
(11, 'ON_PROBATION', 'ACTIVE', 'Confirmation review cleared by HR Head.', 2, 'Priyanka Deshmukh'),
(14, 'OFFER_ACCEPTED', 'ON_PROBATION', 'Candidate joined facility on 10 Jun 2024 under 6-month probation.', 2, 'Priyanka Deshmukh'),
(18, 'NOTICE_PERIOD', 'EXITED', 'Formal handover completed and no-due clearance certificates signed.', 2, 'Priyanka Deshmukh'),
(21, 'ACTIVE', 'RESIGNATION_SUBMITTED', 'Formal resignation letter submitted via portal.', 2, 'Priyanka Deshmukh'),
(22, 'RESIGNATION_SUBMITTED', 'NOTICE_PERIOD', '30-day notice period sanctioned by reporting manager.', 2, 'Priyanka Deshmukh');

SET FOREIGN_KEY_CHECKS = 1;
