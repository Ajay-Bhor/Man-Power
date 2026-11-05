-- ==============================================================================
-- Flyway Migration: V7__approvals_inbox.sql
-- Description: Create approvals and approval_comments tables with seed data matching reference UI
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create Approvals Table
CREATE TABLE IF NOT EXISTS approvals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_code VARCHAR(50) NOT NULL UNIQUE,
    approval_type ENUM('OFFER_APPROVAL', 'REQUISITION_APPROVAL', 'HIRING_APPROVAL', 'OTHER_APPROVAL') NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'OFFER', 'REQUISITION', 'CANDIDATE', 'BACKGROUND_CHECK'
    entity_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(100) NULL,
    priority ENUM('HIGH', 'MEDIUM', 'LOW', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    
    -- Requester details
    requested_by_id BIGINT NULL,
    requester_name VARCHAR(150) NOT NULL,
    requester_role VARCHAR(100) NOT NULL,
    requester_avatar VARCHAR(500) NULL,
    request_date DATETIME NOT NULL,
    
    -- Approver / Assignment
    assigned_approver_id BIGINT NULL,
    assigned_approver_role VARCHAR(50) NULL,
    
    -- Decision details
    decision_by_id BIGINT NULL,
    decision_by_name VARCHAR(150) NULL,
    decision_date DATETIME NULL,
    decision_remarks TEXT NULL,
    
    -- Specific Details for Offer & Requisition
    candidate_name VARCHAR(150) NULL,
    candidate_email VARCHAR(150) NULL,
    candidate_phone VARCHAR(50) NULL,
    candidate_avatar VARCHAR(500) NULL,
    job_title VARCHAR(150) NULL,
    openings INT NULL,
    justification TEXT NULL,
    target_joining_date DATE NULL,
    offer_date DATE NULL,
    proposed_joining_date DATE NULL,
    ctc_fixed DECIMAL(12,2) NULL,
    ctc_variable DECIMAL(12,2) NULL,
    ctc_total DECIMAL(12,2) NULL,
    offer_letter_url VARCHAR(500) NULL,
    details_json TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_approvals_type (approval_type),
    INDEX idx_approvals_status (status),
    INDEX idx_approvals_department (department),
    INDEX idx_approvals_requested_by (requested_by_id),
    INDEX idx_approvals_assigned_approver (assigned_approver_id),
    INDEX idx_approvals_request_date (request_date),
    CONSTRAINT fk_approvals_requested_by FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_approvals_assigned_approver FOREIGN KEY (assigned_approver_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_approvals_decision_by FOREIGN KEY (decision_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Approval Comments Table
CREATE TABLE IF NOT EXISTS approval_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_approval_comments_approval_id (approval_id),
    CONSTRAINT fk_approval_comments_approval FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Reference Records
-- Clear existing to allow clean idempotent migration
DELETE FROM approval_comments WHERE approval_id > 0;
DELETE FROM approvals WHERE id > 0;

-- Row 1: Offer Approval - Amit Patil
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    1, 'APP-2026-001', 'OFFER_APPROVAL', 'OFFER', 1,
    'Offer Approval', 'Amit Patil | Software Engineer | Pune', 'IT', 'Pune',
    'HIGH', 'PENDING', 3, 'Sneha Shah', 'Recruiter', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    '2026-10-10 10:30:00', 2, 'ROLE_HR_ADMIN',
    'Amit Patil', 'amit.patil@gmail.com', '+91 98765 43210', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'Software Engineer', 1, 'Selected after 2 technical rounds and managerial review for backend core API integration.',
    '2026-11-01', '2026-10-10', '2026-11-01',
    550000.00, 170000.00, 720000.00, '/documents/offers/URJ-OFF-2026-001.pdf',
    '{"workflow": [{"step": "Offer Created", "date": "10 Oct 2026, 10:20 AM", "user": "Sneha Shah", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "10 Oct 2026, 10:30 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 2: Job Requisition - JR-2026-015
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    2, 'APP-2026-002', 'REQUISITION_APPROVAL', 'REQUISITION', 25,
    'Job Requisition', 'JR-2026-015 | Plant Operator | Rahuri', 'Plant Operations', 'Rahuri',
    'HIGH', 'PENDING', 6, 'Vikram Desai', 'Hiring Manager', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    '2026-10-09 16:15:00', 2, 'ROLE_HR_ADMIN',
    NULL, NULL, NULL, NULL,
    'Plant Operator', 2, 'Urgent replacement for plant expansion in solvent extraction unit 2. Requires certified boiler and silo operator.',
    '2026-11-15', NULL, NULL,
    350000.00, 50000.00, 400000.00, NULL,
    '{"workflow": [{"step": "Requisition Submitted", "date": "09 Oct 2026, 04:10 PM", "user": "Vikram Desai", "status": "COMPLETED"}, {"step": "HR Review & Budget Approval", "date": "09 Oct 2026, 04:15 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Senior Management Sanction", "date": "Pending", "user": "Siddharth Mehta (VP)", "status": "WAITING"}, {"step": "Recruiter Assignment", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 3: Offer Approval - Neha Joshi
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    3, 'APP-2026-003', 'OFFER_APPROVAL', 'OFFER', 2,
    'Offer Approval', 'Neha Joshi | HR Executive | Mumbai', 'Human Resources', 'Mumbai',
    'MEDIUM', 'PENDING', 4, 'Rahul More', 'Recruiter', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    '2026-10-09 11:20:00', 2, 'ROLE_HR_ADMIN',
    'Neha Joshi', 'neha.joshi@gmail.com', '+91 98221 44552', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'HR Executive', 1, 'Final candidate selected for employee onboarding and statutory compliance handling at Mumbai Corporate Office.',
    '2026-10-25', '2026-10-09', '2026-10-25',
    600000.00, 80000.00, 680000.00, '/documents/offers/URJ-OFF-2026-002.pdf',
    '{"workflow": [{"step": "Offer Created", "date": "09 Oct 2026, 11:10 AM", "user": "Rahul More", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "09 Oct 2026, 11:20 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 4: Hiring Approval - QA Analyst Hiring
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    4, 'APP-2026-004', 'HIRING_APPROVAL', 'CANDIDATE', 103,
    'Hiring Approval', 'QA Analyst Hiring | Quality | Pune', 'Quality', 'Pune',
    'MEDIUM', 'PENDING', 5, 'Anita Kulkarni', 'Department Head', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    '2026-10-08 14:10:00', 2, 'ROLE_HR_ADMIN',
    'Pooja Kale', 'pooja.kale@gmail.com', '+91 98221 44558', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    'QA Analyst', 1, 'Final selection approval for QA Analyst after technical assessment. Score: 4.8/5. Ready for offer generation.',
    '2026-11-05', NULL, '2026-11-05',
    480000.00, 70000.00, 550000.00, NULL,
    '{"workflow": [{"step": "Interview Rounds Completed", "date": "08 Oct 2026, 01:30 PM", "user": "Panel Rating 4.8/5", "status": "COMPLETED"}, {"step": "HOD Hiring Recommendation", "date": "08 Oct 2026, 02:10 PM", "user": "Anita Kulkarni", "status": "COMPLETED"}, {"step": "HR Signoff", "date": "08 Oct 2026, 02:10 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Generation", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 5: Offer Approval - Rahul More
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    5, 'APP-2026-005', 'OFFER_APPROVAL', 'OFFER', 4,
    'Offer Approval', 'Rahul More | Production Engineer | Shirdi', 'Production', 'Shirdi',
    'LOW', 'PENDING', 3, 'Sneha Shah', 'Recruiter', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    '2026-10-07 17:40:00', 2, 'ROLE_HR_ADMIN',
    'Rahul More', 'rahul.more@gmail.com', '+91 98221 44553', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    'Production Engineer', 1, 'Selected for Shirdi Feed Mill operation and extruder shift management.',
    '2026-11-01', '2026-10-07', '2026-11-01',
    480000.00, 60000.00, 540000.00, '/documents/offers/URJ-OFF-2026-004.pdf',
    '{"workflow": [{"step": "Offer Created", "date": "07 Oct 2026, 05:25 PM", "user": "Sneha Shah", "status": "COMPLETED"}, {"step": "Pending Approval", "date": "07 Oct 2026, 05:40 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Offer Sent", "date": "Pending", "user": "", "status": "WAITING"}, {"step": "Accepted / Declined", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 6: Job Requisition - JR-2026-014
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    6, 'APP-2026-006', 'REQUISITION_APPROVAL', 'REQUISITION', 23,
    'Job Requisition', 'JR-2026-014 | Quality Analyst | Pune', 'Quality', 'Pune',
    'MEDIUM', 'PENDING', 9, 'Sandeep Jadhav', 'Plant Head', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    '2026-10-06 13:25:00', 2, 'ROLE_HR_ADMIN',
    NULL, NULL, NULL, NULL,
    'Quality Analyst', 1, 'Headcount expansion for upcoming FSSAI and HACCP quality certifications.',
    '2026-11-20', NULL, NULL,
    450000.00, 50000.00, 500000.00, NULL,
    '{"workflow": [{"step": "Requisition Submitted", "date": "06 Oct 2026, 01:15 PM", "user": "Sandeep Jadhav", "status": "COMPLETED"}, {"step": "HR Review & Budget Approval", "date": "06 Oct 2026, 01:25 PM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Senior Management Sanction", "date": "Pending", "user": "Siddharth Mehta (VP)", "status": "WAITING"}, {"step": "Recruiter Assignment", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Row 7: Background Check - Vikram Desai
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    7, 'APP-2026-007', 'OTHER_APPROVAL', 'BACKGROUND_CHECK', 105,
    'Background Check', 'Vikram Desai | Plant Operator | Rahuri', 'Operations', 'Rahuri',
    'LOW', 'PENDING', 2, 'Priyanka Deshmukh', 'HR Executive', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    '2026-10-06 11:50:00', 2, 'ROLE_HR_ADMIN',
    'Vikram Desai', 'vikram.desai@gmail.com', '+91 98221 44555', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'Plant Operator', 1, 'Third-party BGV clearance report submitted by AuthBridge verification team. Educational and criminal checks verified clear. Awaiting final sign-off.',
    '2026-10-25', NULL, '2026-10-25',
    350000.00, 30000.00, 380000.00, NULL,
    '{"workflow": [{"step": "BGV Initiated", "date": "02 Oct 2026, 10:00 AM", "user": "Priyanka Deshmukh", "status": "COMPLETED"}, {"step": "Agency Report Received", "date": "06 Oct 2026, 11:30 AM", "user": "AuthBridge Team", "status": "COMPLETED"}, {"step": "HR Signoff", "date": "06 Oct 2026, 11:50 AM", "user": "Awaiting your approval", "status": "PENDING"}, {"step": "Final Clear Gate", "date": "Pending", "user": "", "status": "WAITING"}]}'
);

-- Seed records for "Approved Today" (4 records)
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, decision_by_id, decision_by_name, decision_date, decision_remarks,
    candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES 
(8, 'APP-2026-008', 'OFFER_APPROVAL', 'OFFER', 6, 'Offer Approval', 'Pooja Kale | QA / QC Executive | Pune', 'Quality Assurance', 'Pune', 'HIGH', 'APPROVED', 3, 'Sneha Shah', 'Recruiter', NULL, '2026-10-26 09:15:00', 2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-26 10:00:00', 'Approved. Package conforms to grade Q-3 salary band.', 'Pooja Kale', 'pooja.kale@company.com', '+91 98221 44558', NULL, 'QA / QC Executive', 1, 'Replacement position approved.', '2026-11-10', '2026-10-26', '2026-11-10', 500000.00, 50000.00, 550000.00, NULL, '{"workflow": [{"step": "Offer Created", "date": "26 Oct 2026", "status": "COMPLETED"}, {"step": "Approved", "date": "26 Oct 2026", "status": "COMPLETED"}]}'),
(9, 'APP-2026-009', 'REQUISITION_APPROVAL', 'REQUISITION', 21, 'Job Requisition', 'JR-2026-016 | Software Engineer | Pune', 'IT', 'Pune', 'HIGH', 'APPROVED', 5, 'Rajesh Kulkarni', 'Dept Head', NULL, '2026-10-26 08:30:00', 2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-26 09:45:00', 'Approved. Urgent backfill sanctioned.', NULL, NULL, NULL, NULL, 'Software Engineer', 1, 'Urgent backfill for cloud API migration.', '2026-11-20', NULL, NULL, 900000.00, 150000.00, 1050000.00, NULL, '{"workflow": [{"step": "Requisition Submitted", "date": "26 Oct 2026", "status": "COMPLETED"}, {"step": "Approved", "date": "26 Oct 2026", "status": "COMPLETED"}]}'),
(10, 'APP-2026-010', 'HIRING_APPROVAL', 'CANDIDATE', 106, 'Hiring Approval', 'Kishore Pawar | Instrumentation Eng | Pune', 'Engineering', 'Pune', 'MEDIUM', 'APPROVED', 4, 'Rahul Nair', 'Recruiter', NULL, '2026-10-26 09:00:00', 2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-26 10:15:00', 'Technical evaluation score 4.7/5 verified. Approved.', 'Kishore Pawar', 'kishore.pawar@gmail.com', '+91 98221 44557', NULL, 'Instrumentation Eng', 1, 'SCADA implementation specialist.', '2026-11-15', NULL, '2026-11-15', 550000.00, 70000.00, 620000.00, NULL, '{"workflow": [{"step": "Hiring Recommended", "date": "26 Oct 2026", "status": "COMPLETED"}, {"step": "Approved", "date": "26 Oct 2026", "status": "COMPLETED"}]}'),
(11, 'APP-2026-011', 'OFFER_APPROVAL', 'OFFER', 7, 'Offer Approval', 'Nitin Shinde | Mechanical Engineer | Rahuri', 'Engineering', 'Rahuri', 'MEDIUM', 'APPROVED', 3, 'Sneha Shah', 'Recruiter', NULL, '2026-10-26 08:45:00', 2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-26 09:30:00', 'Approved by HR Admin.', 'Nitin Shinde', 'nitin.shinde@gmail.com', '+91 98221 44551', NULL, 'Mechanical Engineer', 1, 'Boiler maintenance lead.', '2026-11-01', '2026-10-26', '2026-11-01', 650000.00, 80000.00, 730000.00, NULL, '{"workflow": [{"step": "Offer Created", "date": "26 Oct 2026", "status": "COMPLETED"}, {"step": "Approved", "date": "26 Oct 2026", "status": "COMPLETED"}]}');

-- Seed records for "Rejected Today" (1 record)
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, decision_by_id, decision_by_name, decision_date, decision_remarks,
    candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    12, 'APP-2026-012', 'OFFER_APPROVAL', 'OFFER', 8, 'Offer Approval', 'Rohan Gaikwad | Shift Incharge Refinery | Pune', 'Production', 'Pune',
    'HIGH', 'REJECTED', 3, 'Sneha Shah', 'Recruiter', NULL, '2026-10-26 09:00:00',
    2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-26 10:20:00', 'Requested compensation exceeds approved budget band for Shift Incharge by 30%.',
    'Rohan Gaikwad', 'rohan.gaikwad@gmail.com', '+91 98221 44563', NULL,
    'Shift Incharge Refinery', 1, 'Refinery plant expansion.', '2026-11-15', '2026-10-26', '2026-11-15',
    850000.00, 150000.00, 1000000.00, NULL,
    '{"workflow": [{"step": "Offer Created", "date": "26 Oct 2026", "status": "COMPLETED"}, {"step": "Rejected", "date": "26 Oct 2026", "status": "REJECTED"}]}'
);

-- Seed records for "Returned for Correction" (1 record)
INSERT INTO approvals (
    id, approval_code, approval_type, entity_type, entity_id, title, subtitle, department, location,
    priority, status, requested_by_id, requester_name, requester_role, requester_avatar, request_date,
    assigned_approver_id, assigned_approver_role, decision_by_id, decision_by_name, decision_date, decision_remarks,
    candidate_name, candidate_email, candidate_phone, candidate_avatar,
    job_title, openings, justification, target_joining_date, offer_date, proposed_joining_date,
    ctc_fixed, ctc_variable, ctc_total, offer_letter_url, details_json
) VALUES (
    13, 'APP-2026-013', 'REQUISITION_APPROVAL', 'REQUISITION', 22, 'Job Requisition', 'JR-2026-017 | Territory Sales Executive | Nashik', 'Sales', 'Nashik',
    'MEDIUM', 'RETURNED', 5, 'Rajesh Kulkarni', 'Dept Head', NULL, '2026-10-24 11:00:00',
    2, 'ROLE_HR_ADMIN', 2, 'Priyanka Deshmukh', '2026-10-25 15:30:00', 'Please clarify whether this is a replacement or new budgeted headcount before HR approval.',
    NULL, NULL, NULL, NULL,
    'Territory Sales Executive', 1, 'Expansion in Nashik territory.', '2026-11-30', NULL, NULL,
    400000.00, 60000.00, 460000.00, NULL,
    '{"workflow": [{"step": "Requisition Submitted", "date": "24 Oct 2026", "status": "COMPLETED"}, {"step": "Returned for Correction", "date": "25 Oct 2026", "status": "RETURNED"}]}'
);

-- Seed initial comments
INSERT INTO approval_comments (approval_id, user_id, user_name, user_role, comment, created_at) VALUES
(1, 3, 'Sneha Shah', 'Recruiter', 'Candidate has accepted all preliminary compensation terms. Fast-track approval requested.', '2026-10-10 10:25:00'),
(2, 6, 'Vikram Desai', 'Hiring Manager', 'Urgent replacement needed before next week harvest season begins.', '2026-10-09 16:12:00'),
(4, 5, 'Anita Kulkarni', 'Department Head', 'Strong technical scores in QA automation and food safety protocols.', '2026-10-08 14:15:00');

SET FOREIGN_KEY_CHECKS = 1;
