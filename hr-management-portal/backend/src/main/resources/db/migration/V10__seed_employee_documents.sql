-- ==============================================================================
-- V10: Seed Verified Employee Documents for Joined ATS Employees
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 10, 'JOINING_KIT', 'Signed Appointment Letter.pdf', 'docs/10/appointment_letter.pdf', 'application/pdf', 2516582, 1, false, 2, '2024-11-01 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 10 AND document_name = 'Signed Appointment Letter.pdf');

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 10, 'NATIONAL_ID', 'Identity & Address Proof.pdf', 'docs/10/id_proof.pdf', 'application/pdf', 1887436, 1, false, 2, '2024-11-01 10:05:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 10 AND document_name = 'Identity & Address Proof.pdf');

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 10, 'DEGREE_CERTIFICATE', 'Educational Degrees & Certifications.pdf', 'docs/10/degrees.pdf', 'application/pdf', 4404019, 1, false, 2, '2024-11-01 10:10:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 10 AND document_name = 'Educational Degrees & Certifications.pdf');

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 10, 'OFFER_LETTER', 'Signed Offer Letter - Software Engineer.pdf', 'docs/10/offer_letter.pdf', 'application/pdf', 985620, 1, true, 2, '2024-10-25 15:30:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 10 AND document_name = 'Signed Offer Letter - Software Engineer.pdf');

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 11, 'JOINING_KIT', 'Signed Appointment Letter - HR Executive.pdf', 'docs/11/appointment_letter.pdf', 'application/pdf', 2411724, 1, false, 2, '2024-08-12 09:30:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 11 AND document_name = 'Signed Appointment Letter - HR Executive.pdf');

INSERT INTO employee_documents (employee_id, category, document_name, storage_key, file_type, file_size_bytes, version_number, is_confidential, uploaded_by, created_at)
SELECT 11, 'NATIONAL_ID', 'Passport & Address Proof.pdf', 'docs/11/passport_proof.pdf', 'application/pdf', 1572864, 1, false, 2, '2024-08-12 09:35:00'
WHERE NOT EXISTS (SELECT 1 FROM employee_documents WHERE employee_id = 11 AND document_name = 'Passport & Address Proof.pdf');

SET FOREIGN_KEY_CHECKS = 1;
