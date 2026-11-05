-- ==============================================================================
-- Flyway Migration: V1__init_schema.sql
-- Description: Initial relational schema for HR Manpower Requisition & Recruitment Portal
-- Target Database: MySQL 8.x
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. ROLES & USERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
    department_restriction_id BIGINT NULL,
    phone_number VARCHAR(30) NULL,
    profile_image_url VARCHAR(500) NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. DEPARTMENTS & DESIGNATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(30) NOT NULL UNIQUE,
    department_name VARCHAR(150) NOT NULL UNIQUE,
    head_user_id BIGINT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_departments_head FOREIGN KEY (head_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS designations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    designation_code VARCHAR(30) NOT NULL,
    designation_name VARCHAR(150) NOT NULL,
    department_id BIGINT NOT NULL,
    level VARCHAR(50) DEFAULT 'Mid-Level',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_designation_dept UNIQUE (designation_name, department_id),
    CONSTRAINT fk_designations_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. EMPLOYEES & DOCUMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(30) NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    reporting_manager_id BIGINT NULL,
    joining_date DATE NOT NULL,
    employment_type ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN') NOT NULL DEFAULT 'FULL_TIME',
    status ENUM('ACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
    work_location VARCHAR(100) DEFAULT 'Headquarters',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_emp_desig FOREIGN KEY (designation_id) REFERENCES designations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_emp_manager FOREIGN KEY (reporting_manager_id) REFERENCES employees (id) ON DELETE SET NULL,
    INDEX idx_emp_dept (department_id),
    INDEX idx_emp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    category ENUM('NATIONAL_ID', 'PASSPORT', 'OFFER_LETTER', 'JOINING_KIT', 'DEGREE_CERTIFICATE', 'NDA_POLICY', 'APPRAISAL_LETTER', 'OTHER') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_doc_emp FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_doc_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_emp_docs_category (employee_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. MANPOWER REQUISITIONS & WORKFLOW APPROVALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requisitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requisition_code VARCHAR(50) NOT NULL UNIQUE,
    job_title VARCHAR(150) NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    headcount INT NOT NULL DEFAULT 1,
    position_type ENUM('NEW_HEADCOUNT', 'REPLACEMENT', 'BUDGETED_EXPANSION') NOT NULL DEFAULT 'NEW_HEADCOUNT',
    replacement_for_employee_id BIGINT NULL,
    priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    experience_years_min INT NOT NULL DEFAULT 1,
    experience_years_max INT NOT NULL DEFAULT 5,
    min_budget DECIMAL(12,2) NULL,
    max_budget DECIMAL(12,2) NULL,
    job_description TEXT NOT NULL,
    justification TEXT NOT NULL,
    status ENUM(
        'DRAFT',
        'PENDING_HR_REVIEW',
        'PENDING_DEPT_APPROVAL',
        'PENDING_SENIOR_APPROVAL',
        'APPROVED',
        'RECRUITER_ASSIGNED',
        'SOURCING',
        'INTERVIEWING',
        'OFFER_IN_PROGRESS',
        'FILLED',
        'CLOSED',
        'REJECTED',
        'RETURNED'
    ) NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL,
    assigned_recruiter_id BIGINT NULL,
    tat_start_date DATE NULL,
    tat_target_days INT NOT NULL DEFAULT 30,
    due_date DATE NULL,
    closed_at TIMESTAMP NULL,
    actual_tat_days INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_req_desig FOREIGN KEY (designation_id) REFERENCES designations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_req_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_req_recruiter FOREIGN KEY (assigned_recruiter_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_req_replacement FOREIGN KEY (replacement_for_employee_id) REFERENCES employees (id) ON DELETE SET NULL,
    INDEX idx_req_status (status),
    INDEX idx_req_recruiter (assigned_recruiter_id),
    INDEX idx_req_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requisition_approvals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    approval_stage ENUM('HR_REVIEW', 'MANAGER_APPROVAL', 'SENIOR_APPROVAL') NOT NULL,
    approver_id BIGINT NOT NULL,
    decision ENUM('APPROVED', 'REJECTED', 'RETURNED_FOR_CORRECTION', 'PENDING') NOT NULL DEFAULT 'PENDING',
    remarks TEXT NULL,
    decision_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_appr_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_req_appr_user FOREIGN KEY (approver_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_req_appr_stage (requisition_id, approval_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requisition_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    action_comment TEXT NULL,
    changed_by BIGINT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_hist_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_req_hist_user FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_req_hist_time (requisition_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. RECRUITMENT TASKS & RECRUITER WORKLOAD
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    assigned_user_id BIGINT NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT NULL,
    due_date DATE NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    priority ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_user FOREIGN KEY (assigned_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_tasks_user_status (assigned_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. CANDIDATES & RESUMES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    candidate_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    experience_years DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    current_employer VARCHAR(150) NULL,
    current_designation VARCHAR(150) NULL,
    current_ctc DECIMAL(12,2) NULL,
    expected_ctc DECIMAL(12,2) NULL,
    notice_period_days INT DEFAULT 30,
    primary_skills TEXT NULL,
    source ENUM('LINKEDIN', 'NAUKRI', 'REFERRAL', 'COMPANY_CAREERS', 'CAMPUS', 'HEADHUNTER') DEFAULT 'LINKEDIN',
    requisition_id BIGINT NOT NULL,
    status ENUM(
        'APPLIED',
        'SCREENING',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_IN_PROGRESS',
        'OFFER_EXTENDED',
        'OFFER_ACCEPTED',
        'JOINED',
        'REJECTED',
        'WITHDRAWN'
    ) NOT NULL DEFAULT 'APPLIED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cand_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE RESTRICT,
    INDEX idx_cand_status (status),
    INDEX idx_cand_req (requisition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    candidate_id BIGINT NOT NULL,
    requisition_id BIGINT NOT NULL,
    document_type ENUM('RESUME', 'COVER_LETTER', 'PORTFOLIO', 'CERTIFICATE', 'PAYSLIP') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cand_doc_cand FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    CONSTRAINT fk_cand_doc_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. INTERVIEWS & FEEDBACK
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    candidate_id BIGINT NOT NULL,
    requisition_id BIGINT NOT NULL,
    round ENUM('HR_SCREENING', 'TECHNICAL_R1', 'TECHNICAL_R2', 'MANAGERIAL', 'DIRECTOR_FINAL') NOT NULL,
    interviewer_id BIGINT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    meeting_link VARCHAR(500) NULL,
    meeting_location VARCHAR(200) DEFAULT 'Online MS Teams',
    status ENUM('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_intr_cand FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    CONSTRAINT fk_intr_req FOREIGN KEY (requisition_id) REFERENCES requisitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_intr_interviewer FOREIGN KEY (interviewer_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_intr_scheduled (scheduled_at),
    INDEX idx_intr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    interview_id BIGINT NOT NULL UNIQUE,
    technical_rating INT NOT NULL CHECK (technical_rating BETWEEN 1 AND 5),
    communication_rating INT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
    culture_fit_rating INT NOT NULL CHECK (culture_fit_rating BETWEEN 1 AND 5),
    overall_rating DECIMAL(3,1) NOT NULL,
    recommendation ENUM('STRONG_HIRE', 'HIRE', 'HOLD', 'REJECT') NOT NULL,
    strengths TEXT NULL,
    weaknesses TEXT NULL,
    detailed_comments TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feed_intr FOREIGN KEY (interview_id) REFERENCES interviews (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. NOTIFICATIONS & EMAIL LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target_url VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS & BACKUP HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT NULL,
    actor_name VARCHAR(150) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    backup_type ENUM('SCHEDULED_DAILY', 'SCHEDULED_WEEKLY', 'MANUAL_FULL', 'DATABASE_ONLY') NOT NULL,
    status ENUM('IN_PROGRESS', 'SUCCESS', 'FAILED') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    location_reference VARCHAR(500) NOT NULL,
    checksum_hash VARCHAR(100) NULL,
    initiated_by BIGINT NULL,
    error_message TEXT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_backup_user FOREIGN KEY (initiated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
