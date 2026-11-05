-- ==============================================================================
-- Flyway Migration: V6__offers_and_onboarding.sql
-- Description: Create offers and onboarding tracking tables with initial dataset
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create Offers Table
CREATE TABLE IF NOT EXISTS offers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    offer_code VARCHAR(50) NOT NULL UNIQUE,
    candidate_id BIGINT NOT NULL,
    candidate_name VARCHAR(150) NOT NULL,
    candidate_email VARCHAR(150) NOT NULL,
    requisition_id BIGINT NULL,
    requisition_code VARCHAR(50) NULL,
    job_title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    offer_date DATE NOT NULL,
    joining_date DATE NOT NULL,
    ctc_fixed DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ctc_variable DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ctc_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'OFFER_SENT', 'ACCEPTED', 'DECLINED', 'JOINING_SCHEDULED', 'ONBOARDING', 'ONBOARDED', 'WITHDRAWN', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    onboarding_status ENUM('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_STARTED',
    approval_stage VARCHAR(50) NOT NULL DEFAULT 'Approved',
    offer_letter_url VARCHAR(500) NULL,
    decline_reason VARCHAR(500) NULL,
    notes TEXT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_offers_status (status),
    INDEX idx_offers_onboarding_status (onboarding_status),
    INDEX idx_offers_candidate_id (candidate_id),
    INDEX idx_offers_requisition_id (requisition_id),
    CONSTRAINT fk_offers_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_offers_requisition FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE SET NULL,
    CONSTRAINT fk_offers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Onboarding Checklists Table
CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    offer_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(150) NULL,
    verified_at TIMESTAMP NULL,
    document_url VARCHAR(500) NULL,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_onboarding_offer_id (offer_id),
    CONSTRAINT fk_onboarding_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ensure Candidate Records exist for all 24 Offers
-- Insert mock candidates 101 to 124 if not present
INSERT IGNORE INTO candidates (id, candidate_code, name, email, mobile, experience_years, current_employer, current_designation, current_ctc, expected_ctc, notice_period_days, primary_skills, source, requisition_id, status)
VALUES
(101, 'CAN-2026-M01', 'Amit Patil', 'amit.patil@gmail.com', '+91 98221 44541', 5.0, 'Infosys', 'Software Engineer', 8.0, 11.0, 30, 'Java, Spring Boot, React', 'LINKEDIN', 21, 'OFFER_ACCEPTED'),
(102, 'CAN-2026-M02', 'Neha Joshi', 'neha.joshi@gmail.com', '+91 98221 44542', 3.0, 'TCS', 'HR Executive', 5.0, 6.8, 15, 'Recruitment, Onboarding', 'NAUKRI', 22, 'OFFER_EXTENDED'),
(103, 'CAN-2026-M03', 'Rahul More', 'rahul.more@gmail.com', '+91 98221 44543', 4.0, 'Wipro', 'Quality Analyst', 5.5, 7.2, 30, 'QA, Automation, Testing', 'REFERRAL', 23, 'JOINING_SCHEDULED'),
(104, 'CAN-2026-M04', 'Sneha Shah', 'sneha.shah@gmail.com', '+91 98221 44544', 4.5, 'Reliance', 'Production Engineer', 7.0, 10.0, 30, 'Production, Plant Ops', 'COMPANY_CAREERS', 24, 'OFFER_ACCEPTED'),
(105, 'CAN-2026-M05', 'Vikram Desai', 'vikram.desai@gmail.com', '+91 98221 44545', 2.0, 'Mahindra', 'Plant Operator', 3.5, 5.0, 15, 'Plant Operations', 'NAUKRI', 25, 'WITHDRAWN'),
(106, 'CAN-2026-M06', 'Pooja Kale', 'pooja.kale@gmail.com', '+91 98221 44546', 3.5, 'Godrej', 'QA / QC Executive', 6.0, 7.8, 30, 'QC, Auditing, QA', 'LINKEDIN', 26, 'OFFER_EXTENDED'),
(107, 'CAN-2026-M07', 'Soham Gawade', 'soham.gawade@gmail.com', '+91 98221 44547', 4.0, 'Thermax', 'Maintenance Engineer', 6.0, 8.2, 30, 'Maintenance, Electrical', 'NAUKRI', 27, 'JOINING_SCHEDULED'),
(108, 'CAN-2026-M08', 'Riya Patil', 'riya.patil@gmail.com', '+91 98221 44548', 3.2, 'Tech Mahindra', 'HR Executive', 5.2, 7.0, 15, 'HR Operations, Engagement', 'COMPANY_CAREERS', 22, 'OFFER_EXTENDED'),
(109, 'CAN-2026-M09', 'Nitin Shinde', 'nitin.shinde@gmail.com', '+91 98221 44551', 4.5, 'Kirloskar Pneumatic', 'Mechanical Engineer', 6.5, 8.5, 30, 'Pumps, Compressors, Plant Maintenance', 'LINKEDIN', 21, 'OFFER_EXTENDED'),
(110, 'CAN-2026-M10', 'Priya Kadam', 'priya.kadam@gmail.com', '+91 98221 44552', 3.0, 'Godrej Agrovet', 'Quality Chemist', 4.8, 6.2, 15, 'HPLC, Titration, Food Safety', 'NAUKRI', 22, 'OFFER_ACCEPTED'),
(111, 'CAN-2026-M11', 'Ganesh Jadhav', 'ganesh.jadhav@gmail.com', '+91 98221 44553', 6.0, 'Venky\'s Ltd', 'Poultry Officer', 8.0, 10.5, 30, 'Broiler Management, Feed Formulation', 'REFERRAL', 23, 'OFFER_EXTENDED'),
(112, 'CAN-2026-M12', 'Anjali Deshmukh', 'anjali.deshmukh@gmail.com', '+91 98221 44554', 5.0, 'Tata Chemicals', 'Operations Lead', 7.5, 9.8, 45, 'Solvent Extraction, Distillation', 'COMPANY_CAREERS', 24, 'OFFER_ACCEPTED'),
(113, 'CAN-2026-M13', 'Suresh Rathod', 'suresh.rathod@gmail.com', '+91 98221 44555', 2.0, 'Local Agro', 'Store Assistant', 3.2, 4.2, 15, 'SAP MM, Inventory, Goods Receipt', 'NAUKRI', 25, 'OFFER_EXTENDED'),
(114, 'CAN-2026-M14', 'Meena Kulkarni', 'meena.kulkarni@gmail.com', '+91 98221 44556', 7.5, 'Baramati Agro', 'Accounts Executive', 9.0, 11.5, 30, 'GST, Tally Prime, Vendor Reconciliation', 'LINKEDIN', 26, 'OFFER_ACCEPTED'),
(115, 'CAN-2026-M15', 'Kishore Pawar', 'kishore.pawar@gmail.com', '+91 98221 44557', 3.5, 'Praj Industries', 'Instrumentation Eng.', 5.5, 7.2, 30, 'PLC, SCADA, Temperature Transmitters', 'HEADHUNTER', 27, 'OFFER_EXTENDED'),
(116, 'CAN-2026-M16', 'Radhika More', 'radhika.more@gmail.com', '+91 98221 44558', 4.0, 'Serum Institute', 'Microbiologist', 6.0, 7.8, 30, 'Cleanroom, Culture Prep, Sterility', 'NAUKRI', 21, 'OFFER_EXTENDED'),
(117, 'CAN-2026-M17', 'Deepak Bhosale', 'deepak.bhosale@gmail.com', '+91 98221 44559', 8.0, 'Thermax Ltd', 'Boiler First Class', 10.0, 13.0, 30, 'AFBC Boiler, Steam Turbine, Water Treatment', 'REFERRAL', 21, 'JOINED'),
(118, 'CAN-2026-M18', 'Swati Thorat', 'swati.thorat@gmail.com', '+91 98221 44560', 3.0, 'Amul Dairy', 'Packaging Specialist', 4.5, 6.0, 15, 'Form-Fill-Seal, Pouch Packing, Batch Coding', 'NAUKRI', 22, 'JOINED'),
(119, 'CAN-2026-M19', 'Mahesh Jagtap', 'mahesh.jagtap@gmail.com', '+91 98221 44561', 5.5, 'De Laval', 'Dairy Farm Specialist', 7.2, 9.5, 30, 'Milking Parlor, Silage, Herd Health', 'LINKEDIN', 23, 'JOINED'),
(120, 'CAN-2026-M20', 'Pooja Sawant', 'pooja.sawant@gmail.com', '+91 98221 44562', 2.5, 'Urja Agri', 'Lab Assistant', 3.5, 4.8, 15, 'NIR Analyzer, Moisture Testing', 'COMPANY_CAREERS', 24, 'OFFER_EXTENDED'),
(121, 'CAN-2026-M21', 'Rohan Gaikwad', 'rohan.gaikwad@gmail.com', '+91 98221 44563', 6.0, 'Adani Wilmar', 'Shift Incharge Refinery', 8.5, 11.0, 30, 'Neutralizer, Bleacher, Deodorizer', 'LINKEDIN', 25, 'WITHDRAWN'),
(122, 'CAN-2026-M22', 'Sunita Mane', 'sunita.mane@gmail.com', '+91 98221 44564', 4.0, 'ITC Agro', 'Agri Procurement Exec', 5.8, 7.5, 30, 'Mandi Purchase, Moisture Deduction, APMC', 'REFERRAL', 26, 'OFFER_ACCEPTED'),
(123, 'CAN-2026-M23', 'Ajay Shinde', 'ajay.shinde@gmail.com', '+91 98221 44565', 5.0, 'Mahindra Logistics', 'Dispatch Officer', 6.2, 8.0, 30, 'Vehicle Tracking, LR Booking, E-way Bill', 'NAUKRI', 27, 'OFFER_EXTENDED'),
(124, 'CAN-2026-M24', 'Pallavi Nalawade', 'pallavi.nalawade@gmail.com', '+91 98221 44566', 3.2, 'Marico', 'Safety Officer', 5.0, 6.8, 15, 'Fire Safety, PPE Compliance, HAZOP', 'COMPANY_CAREERS', 21, 'OFFER_ACCEPTED');

-- 4. Seed the 24 Offers with exact status distribution:
-- Total Offers: 24
-- Offers Sent: 8
-- Accepted: 6
-- Declined: 2
-- Joining Scheduled: 5
-- Onboarding in Progress: 4 (within Accepted / Joining Scheduled)
-- Onboarded: 3
TRUNCATE TABLE onboarding_checklists;
DELETE FROM offers;

INSERT INTO offers (id, offer_code, candidate_id, candidate_name, candidate_email, requisition_id, requisition_code, job_title, department, location, offer_date, joining_date, ctc_fixed, ctc_variable, ctc_total, status, onboarding_status, approval_stage, offer_letter_url, notes, created_by)
VALUES
-- 1. Amit Patil (Screenshot row 1)
(1, 'URJ-OFF-2026-001', 101, 'Amit Patil', 'amit.patil@gmail.com', 21, 'URJ-R-2026-008', 'Software Engineer', 'Engineering & Technology', 'Pune', '2026-10-10', '2026-11-01', 9.50, 1.50, 11.00, 'ACCEPTED', 'NOT_STARTED', 'Approved', '/documents/offers/URJ-OFF-2026-001.pdf', 'Selected in Managerial Round. Relocating from Nashik.', 2),

-- 2. Neha Joshi (Screenshot row 2)
(2, 'URJ-OFF-2026-002', 102, 'Neha Joshi', 'neha.joshi@gmail.com', 22, 'URJ-R-2026-007', 'HR Executive', 'Human Resources', 'Mumbai', '2026-10-08', '2026-10-20', 6.00, 0.80, 6.80, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-002.pdf', 'Offer dispatched via email. Awaiting candidate sign-back.', 2),

-- 3. Rahul More (Screenshot row 3)
(3, 'URJ-OFF-2026-003', 103, 'Rahul More', 'rahul.more@gmail.com', 23, 'URJ-R-2026-006', 'Quality Analyst', 'Quality Assurance', 'Pune', '2026-10-07', '2026-10-15', 6.20, 1.00, 7.20, 'JOINING_SCHEDULED', 'IN_PROGRESS', 'Approved', '/documents/offers/URJ-OFF-2026-003.pdf', 'Reporting at Pune Corporate Office on Oct 15 at 09:30 AM.', 2),

-- 4. Sneha Shah (Screenshot row 4)
(4, 'URJ-OFF-2026-004', 104, 'Sneha Shah', 'sneha.shah@gmail.com', 24, 'URJ-R-2026-005', 'Production Engineer', 'Plant Operations', 'Shirdi', '2026-10-05', '2026-10-10', 8.50, 1.50, 10.00, 'ACCEPTED', 'IN_PROGRESS', 'Approved', '/documents/offers/URJ-OFF-2026-004.pdf', 'Plant accommodation allocated at Shirdi quarters.', 2),

-- 5. Vikram Desai (Screenshot row 5)
(5, 'URJ-OFF-2026-005', 105, 'Vikram Desai', 'vikram.desai@gmail.com', 25, 'URJ-R-2026-025', 'Plant Operator', 'Plant Operations', 'Rahuri', '2026-10-03', '2026-10-12', 4.50, 0.50, 5.00, 'DECLINED', 'NOT_APPLICABLE', 'Approved', '/documents/offers/URJ-OFF-2026-005.pdf', 'Candidate opted for another offer closer to home in Ahmednagar.', 2),

-- 6. Pooja Kale
(6, 'URJ-OFF-2026-006', 106, 'Pooja Kale', 'pooja.kale@gmail.com', 26, 'URJ-R-2026-026', 'QA / QC Executive', 'Quality Assurance', 'Pune', '2026-10-11', '2026-11-05', 6.80, 1.00, 7.80, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-006.pdf', 'Offer letter issued with 30-day joining window.', 3),

-- 7. Nitin Shinde
(7, 'URJ-OFF-2026-007', 109, 'Nitin Shinde', 'nitin.shinde@gmail.com', 21, 'URJ-R-2026-008', 'Mechanical Engineer', 'Soya Division', 'Plant - Rahuri', '2026-10-12', '2026-11-10', 7.50, 1.00, 8.50, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-007.pdf', 'Boiler & turbine maintenance role.', 2),

-- 8. Priya Kadam
(8, 'URJ-OFF-2026-008', 110, 'Priya Kadam', 'priya.kadam@gmail.com', 22, 'URJ-R-2026-007', 'Quality Chemist', 'Quality Assurance', 'Plant - Rahuri', '2026-10-09', '2026-10-25', 5.50, 0.70, 6.20, 'ACCEPTED', 'IN_PROGRESS', 'Approved', '/documents/offers/URJ-OFF-2026-008.pdf', 'Food safety testing specialist.', 3),

-- 9. Ganesh Jadhav
(9, 'URJ-OFF-2026-009', 111, 'Ganesh Jadhav', 'ganesh.jadhav@gmail.com', 23, 'URJ-R-2026-006', 'Poultry Officer', 'Poultry Integration', 'Plant - Nashik', '2026-10-06', '2026-10-22', 9.00, 1.50, 10.50, 'JOINING_SCHEDULED', 'IN_PROGRESS', 'Approved', '/documents/offers/URJ-OFF-2026-009.pdf', 'Joining confirmation received. Orientation kit dispatched.', 4),

-- 10. Anjali Deshmukh
(10, 'URJ-OFF-2026-010', 112, 'Anjali Deshmukh', 'anjali.deshmukh@gmail.com', 24, 'URJ-R-2026-005', 'Operations Lead', 'Soya Division', 'Plant - Rahuri', '2026-10-04', '2026-10-18', 8.50, 1.30, 9.80, 'JOINING_SCHEDULED', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-010.pdf', 'Solvent extraction plant unit incharge.', 2),
-- 11. Suresh Rathod
(11, 'URJ-OFF-2026-011', 113, 'Suresh Rathod', 'suresh.rathod@gmail.com', 25, 'URJ-R-2026-025', 'Store Assistant', 'Soya Division', 'Plant - Rahuri', '2026-10-13', '2026-11-15', 3.80, 0.40, 4.20, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-011.pdf', 'Inventory tracking and gate pass coordinator.', 3),

-- 12. Meena Kulkarni
(12, 'URJ-OFF-2026-012', 114, 'Meena Kulkarni', 'meena.kulkarni@gmail.com', 26, 'URJ-R-2026-026', 'Accounts Executive', 'Finance & Accounts', 'HO - Pune', '2026-10-02', '2026-10-16', 10.00, 1.50, 11.50, 'ACCEPTED', 'NOT_STARTED', 'Approved', '/documents/offers/URJ-OFF-2026-012.pdf', 'GST audits and statutory compliance specialist.', 2),

-- 13. Kishore Pawar
(13, 'URJ-OFF-2026-013', 115, 'Kishore Pawar', 'kishore.pawar@gmail.com', 27, 'URJ-R-2026-027', 'Instrumentation Eng.', 'Soya Division', 'Plant - Rahuri', '2026-10-14', '2026-11-20', 6.50, 0.70, 7.20, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-013.pdf', 'SCADA automation expert for refinery.', 4),

-- 14. Radhika More
(14, 'URJ-OFF-2026-014', 116, 'Radhika More', 'radhika.more@gmail.com', 21, 'URJ-R-2026-028', 'Microbiologist', 'Quality Assurance', 'Plant - Rahuri', '2026-10-11', '2026-11-08', 7.00, 0.80, 7.80, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-014.pdf', 'Salmonella testing & pathogen identification.', 3),

-- 15. Deepak Bhosale (ONBOARDED 1)
(15, 'URJ-OFF-2026-015', 117, 'Deepak Bhosale', 'deepak.bhosale@gmail.com', 21, 'URJ-R-2026-008', 'Boiler First Class', 'Plant Operations', 'Plant - Shirdi', '2026-09-15', '2026-10-01', 11.50, 1.50, 13.00, 'ONBOARDED', 'COMPLETED', 'Approved', '/documents/offers/URJ-OFF-2026-015.pdf', 'Fully onboarded. Employee ID EMP012 generated.', 2),

-- 16. Swati Thorat (ONBOARDED 2)
(16, 'URJ-OFF-2026-016', 118, 'Swati Thorat', 'swati.thorat@gmail.com', 22, 'URJ-R-2026-007', 'Packaging Specialist', 'Cattle Feed Sales', 'Pune Region', '2026-09-18', '2026-10-05', 5.20, 0.80, 6.00, 'ONBOARDED', 'COMPLETED', 'Approved', '/documents/offers/URJ-OFF-2026-016.pdf', 'Formalities complete. Assigned to pouch packaging line.', 2),

-- 17. Mahesh Jagtap (ONBOARDED 3)
(17, 'URJ-OFF-2026-017', 119, 'Mahesh Jagtap', 'mahesh.jagtap@gmail.com', 23, 'URJ-R-2026-006', 'Dairy Farm Specialist', 'Soya Division', 'Plant - Rahuri', '2026-09-20', '2026-10-08', 8.20, 1.30, 9.50, 'ONBOARDED', 'COMPLETED', 'Approved', '/documents/offers/URJ-OFF-2026-017.pdf', 'Onboarding completed. Reporting to Rajesh Kulkarni.', 2),

-- 18. Pooja Sawant
(18, 'URJ-OFF-2026-018', 120, 'Pooja Sawant', 'pooja.sawant@gmail.com', 24, 'URJ-R-2026-005', 'Lab Assistant', 'Quality Assurance', 'Plant - Rahuri', '2026-10-10', '2026-10-28', 4.20, 0.60, 4.80, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-018.pdf', 'Dispatched letter on Oct 10.', 3),

-- 19. Rohan Gaikwad (DECLINED 2)
(19, 'URJ-OFF-2026-019', 121, 'Rohan Gaikwad', 'rohan.gaikwad@gmail.com', 25, 'URJ-R-2026-025', 'Shift Incharge Refinery', 'Soya Division', 'Plant - Rahuri', '2026-09-25', '2026-10-10', 9.50, 1.50, 11.00, 'DECLINED', 'NOT_APPLICABLE', 'Approved', '/documents/offers/URJ-OFF-2026-019.pdf', 'Candidate received counter-offer from current employer.', 2),

-- 20. Sunita Mane
(20, 'URJ-OFF-2026-020', 122, 'Sunita Mane', 'sunita.mane@gmail.com', 26, 'URJ-R-2026-026', 'Agri Procurement Exec', 'Soya Division', 'HO - Pune', '2026-10-08', '2026-10-26', 6.50, 1.00, 7.50, 'ACCEPTED', 'NOT_STARTED', 'Approved', '/documents/offers/URJ-OFF-2026-020.pdf', 'Signed copy received. Joining scheduled for Oct 26.', 3),

-- 21. Ajay Shinde
(21, 'URJ-OFF-2026-021', 123, 'Ajay Shinde', 'ajay.shinde@gmail.com', 27, 'URJ-R-2026-027', 'Dispatch Officer', 'Feedmill Plant', 'Plant - Rahuri', '2026-10-07', '2026-10-24', 7.00, 1.00, 8.00, 'JOINING_SCHEDULED', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-021.pdf', 'Vehicle logistics incharge.', 4),

-- 22. Pallavi Nalawade
(22, 'URJ-OFF-2026-022', 124, 'Pallavi Nalawade', 'pallavi.nalawade@gmail.com', 21, 'URJ-R-2026-028', 'Safety Officer', 'Plant Operations', 'Plant - Shirdi', '2026-10-09', '2026-10-27', 6.00, 0.80, 6.80, 'ACCEPTED', 'NOT_STARTED', 'Approved', '/documents/offers/URJ-OFF-2026-022.pdf', 'Factory safety & OHSAS norms coordinator.', 2),

-- 23. Riya Patil
(23, 'URJ-OFF-2026-023', 108, 'Riya Patil', 'riya.patil@gmail.com', 22, 'URJ-R-2026-007', 'HR Executive', 'Human Resources', 'Mumbai', '2026-10-12', '2026-11-02', 6.20, 0.80, 7.00, 'OFFER_SENT', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-023.pdf', 'Employee engagement and attendance tracking.', 2),

-- 24. Soham Gawade
(24, 'URJ-OFF-2026-024', 107, 'Soham Gawade', 'soham.gawade@gmail.com', 27, 'URJ-R-2026-027', 'Maintenance Engineer', 'Plant Operations', 'Plant - Shirdi', '2026-10-06', '2026-10-20', 7.20, 1.00, 8.20, 'JOINING_SCHEDULED', 'PENDING', 'Approved', '/documents/offers/URJ-OFF-2026-024.pdf', 'Plant electrical & mechanical maintenance.', 4);

-- 5. Seed Onboarding Checklist items for Offer 1 (Amit Patil - Progress matching bottom stepper)
INSERT INTO onboarding_checklists (offer_id, category, item_name, is_completed, verified_by, verified_at, notes)
VALUES
(1, 'OFFER_ACCEPTANCE', 'Signed Offer Letter Copy', TRUE, 'Priyanka Deshmukh', '2026-10-12 11:30:00', 'Digitally signed copy uploaded.'),
(1, 'OFFER_ACCEPTANCE', 'Non-Disclosure Agreement (NDA)', TRUE, 'Priyanka Deshmukh', '2026-10-12 11:35:00', 'Signed confidentiality agreement.'),
(1, 'IDENTITY_ADDRESS', 'Aadhaar Card Copy', TRUE, 'Priyanka Deshmukh', '2026-10-12 14:00:00', 'Verified with UIDAI QR code.'),
(1, 'IDENTITY_ADDRESS', 'PAN Card Verification', TRUE, 'Priyanka Deshmukh', '2026-10-12 14:10:00', 'PAN verified via NSDL.'),
(1, 'EDUCATION_EMPLOYMENT', 'Degree Certificate & Marksheets', TRUE, 'Anita Deshmukh', '2026-10-13 10:00:00', 'B.E. Computer Science from Pune University.'),
(1, 'EDUCATION_EMPLOYMENT', 'Relieving Letter / Resignation Acceptance', TRUE, 'Anita Deshmukh', '2026-10-13 11:00:00', 'Relieving confirmed from previous employer.'),
(1, 'EDUCATION_EMPLOYMENT', 'Last 3 Months Salary Payslips', TRUE, 'Anita Deshmukh', '2026-10-13 11:15:00', 'Salary slips verified.'),
(1, 'BGV', 'Criminal Background Verification (Police Clearance)', FALSE, NULL, NULL, 'Submitted to BGV agency. Verification in progress.'),
(1, 'BGV', 'Past Employment Reference Check', TRUE, 'Priyanka Deshmukh', '2026-10-14 16:00:00', 'Positive reference from Reporting Manager.'),
(1, 'JOINING_CONFIRMATION', 'Bank Account Details & Cancelled Cheque', FALSE, NULL, NULL, 'Pending submission by candidate.'),
(1, 'JOINING_CONFIRMATION', 'EPF & Gratuity Nominee Details Form', FALSE, NULL, NULL, 'Draft form shared.'),
(1, 'FORMALITIES', 'Pre-Employment Medical Fitness Certificate', FALSE, NULL, NULL, 'Scheduled at Sahyadri Hospital Pune on Oct 25.'),
(1, 'FORMALITIES', 'IT Asset Provisioning (Laptop & Urja Email)', FALSE, NULL, NULL, 'Requisition submitted to IT Admin.');

-- Seed default checklists for other in-progress offers
INSERT INTO onboarding_checklists (offer_id, category, item_name, is_completed, verified_by, verified_at, notes)
VALUES
(3, 'OFFER_ACCEPTANCE', 'Signed Offer Letter Copy', TRUE, 'Priyanka Deshmukh', '2026-10-09 10:00:00', 'Accepted.'),
(3, 'IDENTITY_ADDRESS', 'Aadhaar Card & PAN Card', TRUE, 'Priyanka Deshmukh', '2026-10-10 11:00:00', 'Verified.'),
(3, 'BGV', 'Past Employment Reference Check', TRUE, 'Priyanka Deshmukh', '2026-10-11 15:00:00', 'Approved.'),
(3, 'FORMALITIES', 'IT Asset & Laptop Allocation', FALSE, NULL, NULL, 'Pending setup.'),
(4, 'OFFER_ACCEPTANCE', 'Signed Offer Letter Copy', TRUE, 'Priyanka Deshmukh', '2026-10-06 14:00:00', 'Accepted.'),
(4, 'IDENTITY_ADDRESS', 'Aadhaar & PAN Verification', TRUE, 'Priyanka Deshmukh', '2026-10-07 10:00:00', 'Verified.'),
(4, 'FORMALITIES', 'Plant Safety Briefing & Medical Fitness', FALSE, NULL, NULL, 'Scheduled at Shirdi plant.');

SET FOREIGN_KEY_CHECKS = 1;
