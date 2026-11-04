-- ==============================================================================
-- Flyway Migration: V3__audit_and_views.sql
-- Description: Analytics views for TAT tracking, Recruiter Workload, and Reporting
-- ==============================================================================

-- View: Requisition TAT Summary
CREATE OR REPLACE VIEW v_requisition_tat_summary AS
SELECT 
    r.id AS requisition_id,
    r.requisition_code,
    r.job_title,
    d.department_name,
    des.designation_name,
    r.headcount,
    r.priority,
    r.status,
    u.name AS recruiter_name,
    r.tat_start_date,
    r.due_date,
    r.tat_target_days,
    CASE 
        WHEN r.status IN ('FILLED', 'CLOSED') THEN COALESCE(r.actual_tat_days, DATEDIFF(COALESCE(r.closed_at, CURRENT_DATE), r.tat_start_date))
        WHEN r.tat_start_date IS NOT NULL THEN DATEDIFF(CURRENT_DATE, r.tat_start_date)
        ELSE 0
    END AS elapsed_days,
    CASE 
        WHEN r.due_date IS NOT NULL THEN DATEDIFF(r.due_date, CURRENT_DATE)
        ELSE NULL
    END AS days_remaining,
    CASE 
        WHEN r.status NOT IN ('FILLED', 'CLOSED', 'REJECTED') AND r.due_date IS NOT NULL AND CURRENT_DATE > r.due_date THEN TRUE
        ELSE FALSE
    END AS is_overdue,
    (SELECT COUNT(*) FROM candidates c WHERE c.requisition_id = r.id) AS total_candidates,
    (SELECT COUNT(*) FROM interviews i WHERE i.requisition_id = r.id AND i.status = 'SCHEDULED') AS pending_interviews
FROM requisitions r
JOIN departments d ON r.department_id = d.id
JOIN designations des ON r.designation_id = des.id
LEFT JOIN users u ON r.assigned_recruiter_id = u.id;

-- View: Recruiter Workload
CREATE OR REPLACE VIEW v_recruiter_workload AS
SELECT 
    u.id AS recruiter_id,
    u.name AS recruiter_name,
    u.email AS recruiter_email,
    COUNT(r.id) AS active_requisitions,
    SUM(r.headcount) AS total_vacancies_assigned,
    SUM(CASE WHEN r.priority = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_vacancies,
    SUM(CASE WHEN r.due_date < CURRENT_DATE AND r.status NOT IN ('FILLED', 'CLOSED') THEN 1 ELSE 0 END) AS overdue_requisitions
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles ro ON ur.role_id = ro.id
LEFT JOIN requisitions r ON r.assigned_recruiter_id = u.id AND r.status NOT IN ('FILLED', 'CLOSED', 'REJECTED')
WHERE ro.role_name = 'ROLE_HR_RECRUITER'
GROUP BY u.id, u.name, u.email;
