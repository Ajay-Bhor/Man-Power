# TalentPulse — Enterprise HR Manpower Requisition & Recruitment Portal

A full-stack enterprise web portal designed to streamline **Manpower Requisitions, Multi-Tier Approval Workflows, 30-Day TAT (Turn-Around-Time) SLA Tracking, Recruiter Workload Management, Candidate Pipeline, and Interview Scorecards**.

---

## 🏛️ System Architecture & Technology Stack

| Layer | Technologies | Role / Responsibilities |
|---|---|---|
| **Backend** | **Java 21**, **Spring Boot 3.3.x** | Enterprise REST APIs, business validation rules, approval workflow engine, TAT SLA calculators, Spring Data JPA, JavaMailSender alerts. |
| **Security** | **Spring Security 6**, **JWT (jjwt 0.12.x)**, **BCrypt** | Role-Based Access Control (RBAC) across 8 user roles, stateless token authentication, sensitive document access guards. |
| **Database** | **MySQL 8.x**, **Flyway Migrations** | Normalized relational database schema with versioned migrations (`V1`, `V2`, `V3`), indexes, foreign keys, and analytical views. |
| **Frontend** | **React.js 18**, **Vite**, **Bootstrap 5**, **Bootstrap Icons** | Corporate Navy-Blue and Crisp-White aesthetic, responsive dashboard, real-time SLA meters, interactive approval matrix, candidate pipelines. |

---

## 📁 Project Directory Structure

```text
hr-management-portal/
├── preview.html                      <-- Standalone zero-dependency interactive portal preview (All 15 modules)
├── README.md
├── frontend/
│   ├── index.html                    <-- Vite template
│   ├── preview.html                  <-- Standalone preview copy
│   ├── package.json                  <-- Vite + React 18 + Bootstrap 5 config
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                   <-- Main interactive multi-module React application
│       ├── main.jsx                  <-- Application entry point
│       ├── data/
│       │   └── mockData.js           <-- Realistic dataset covering all 15 modules & 8 roles
│       ├── styles/
│       │   └── portal.css            <-- Corporate Navy & Crisp White Design System
│       └── utils/
│           └── tatUtils.js           <-- 30-day TAT calculation algorithms & color code mapping
├── backend/
│   ├── pom.xml                       <-- Maven configuration (Spring Boot 3.3.4, Java 21, Security, Flyway)
│   └── src/main/
│       ├── resources/
│       │   └── application.yml       <-- DB configs, Flyway, JWT, TAT settings, SMTP
│       └── java/com/company/hr/
│           ├── HrManagementPortalApplication.java
│           ├── config/
│           ├── controller/           <-- REST Controllers under /api/v1 (Auth, Requisition, Approval, etc.)
│           ├── dto/                  <-- Request/Response DTOs & Validation
│           ├── entity/               <-- 17 JPA Entities (Requisition, Candidate, Interview, AuditLog, etc.)
│           ├── exception/            <-- GlobalExceptionHandler & custom exceptions
│           ├── repository/           <-- Spring Data JPA Repositories
│           ├── security/             <-- JwtTokenProvider, SecurityConfig, UserPrincipal
│           └── service/              <-- TatCalculationService, RequisitionService, ApprovalService, etc.
└── database/
    └── migrations/
        ├── V1__init_schema.sql       <-- MySQL 8.x DDL for all 17 tables, foreign keys, indexes
        ├── V2__seed_initial_data.sql <-- Roles, Users, Departments, Designations, Seed Requisitions
        └── V3__audit_and_views.sql   <-- Analytical views: v_requisition_tat_summary, v_recruiter_workload
```

---

## 👥 8 System Roles & Permissions Matrix

| Role | Role Code | Responsibilities & Access Scope |
|---|---|---|
| **IT Admin** | `ROLE_IT_ADMIN` | Full superuser access, user accounts, system configuration, database backup & restore. |
| **HR Admin** | `ROLE_HR_ADMIN` | Master catalog, requisition vetting, recruiter assignment, employee records, audit reports. |
| **HR Recruiter** | `ROLE_HR_RECRUITER` | Assigned requisitions, 30-day TAT tracking, candidate sourcing, scheduling interviews. |
| **Department Head** | `ROLE_DEPT_HEAD` | Create departmental requisitions, review departmental needs, first-line approvals. |
| **Approving Manager** | `ROLE_APPROVING_MANAGER` | Review, approve, return for correction, or reject manpower requests. |
| **Senior Management** | `ROLE_SENIOR_MGMT` | Executive signoff, strategic headcount expansion approvals, macro-level TAT dashboards. |
| **Interviewer** | `ROLE_INTERVIEWER` | Assigned interview panel calendar, submission of ratings and hire scorecards. |
| **Employee / Requester** | `ROLE_EMPLOYEE` | View employee profile, access authorized documents, submit internal requisitions. |

---

## ⚡ 15 Complete Portal Modules

1. **01. Login & Authentication**: Secure corporate authentication, role switching, password reset simulation, JWT token handling.
2. **02. Executive Dashboard**: Active headcount count, pending approvals queue, candidate pipeline count, overdue TAT warnings.
3. **03. Department & Designation Master**: Organization structure, department codes, designations with job levels, active/inactive toggles.
4. **04. Employee Management**: Employee directory, reporting lines, contact information, work locations.
5. **05. Employee Documents**: Restricted file storage, version history (`v1.0`, `v1.2`), confidential document locks.
6. **06. Manpower Requisition**: Requisition wizard with justification, budget range, headcount, priority, and position type (New vs Replacement).
7. **07. Approval Workflow**: Multi-tier approval pipeline (HR Review ➔ Line Manager ➔ Senior VP ➔ Sanctioned). Supports Approve, Reject (with required justification), and Return for Correction (preserving history).
8. **08. Recruiter Assignment**: Assign vacancies to recruiters, balance recruiter workload, initiate the 30-day TAT SLA clock.
9. **09. Candidate Management**: Candidate profile database, compensation expectations, sourcing channel, pipeline tracking.
10. **10. Interview Scheduler**: Coordinate panel rounds, calendar synchronization, MS Teams meeting links, and 5-star ratings scorecard.
11. **11. TAT & Task Tracking**: Configurable 30-day target, elapsed days, days remaining countdown, overdue warning indicators, and recruiter task checklist.
12. **12. Reports & Analytics**: Department-wise vacancy fill rate, 87.5% TAT compliance, hiring velocity, and CSV export.
13. **13. Email Notifications**: Transactional alerts log for requisitions, approvals, interview invites, and SLA escalations.
14. **14. Backup & Restore**: Automated snapshot tracking, on-demand manual full backups, SHA-256 integrity checksums.
15. **15. User & Permission Management**: User accounts, role assignment, departmental scoping, and complete audit trail.

---

## ⏱️ TAT (Turn-Around-Time) SLA Formula (30-Day Target)

- **TAT Start Date**: Set automatically on the date the vacancy is assigned to a dedicated recruiter.
- **Due Date**: `TAT Start Date + 30 Calendar Days` (or working days when configured in `application.yml`).
- **Elapsed Days**: `Current Date - TAT Start Date`.
- **Days Remaining**: `Due Date - Current Date`.
- **Overdue Condition**: `Current Date > Due Date` and requisition remains unclosed.
- **Actual TAT**: `Closure Date - TAT Start Date`.

---

## 🚀 How to Run the Project

### 1. Instant Interactive Browser Preview (Zero dependencies needed!)
Double-click or open either of these files directly in any web browser (Google Chrome, Microsoft Edge, Firefox):
```text
hr-management-portal/preview.html
```
*Tip: You can use the top-right "Role Switcher" dropdown to experience the system from any of the 8 roles!*

### 2. Frontend Development Server (When Node.js is installed)
```bash
cd frontend
npm install
npm run dev
# Server will start on http://localhost:5173
```

### 3. Backend Spring Boot Server (When Java 21 & Maven are installed)
```bash
cd backend
mvn clean install
mvn spring-boot:run
# Backend REST APIs start on http://localhost:8080
# Swagger API Documentation: http://localhost:8080/swagger-ui.html
```

### 4. Database Schema Setup (MySQL 8.x)
Flyway runs automatically on backend startup. To execute manually:
```bash
mysql -u root -p hr_portal_db < database/migrations/V1__init_schema.sql
mysql -u root -p hr_portal_db < database/migrations/V2__seed_initial_data.sql
mysql -u root -p hr_portal_db < database/migrations/V3__audit_and_views.sql
```
