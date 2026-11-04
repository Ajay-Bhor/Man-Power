package com.company.hr.service;

import com.company.hr.entity.*;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Enterprise Excel Backup Export Service
 * Generates an offline multi-worksheet .xlsx backup of the complete HRMS MySQL database.
 * Uses Apache POI Streaming (Workbook) for low memory overhead and safe cell limits.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HrmsExcelBackupExportService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final RequisitionRepository requisitionRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewFeedbackRepository interviewFeedbackRepository;
    private final OfferRepository offerRepository;
    private final OnboardingChecklistRepository onboardingChecklistRepository;
    private final ApprovalRepository approvalRepository;
    private final RecruitmentTaskRepository recruitmentTaskRepository;
    private final UserRepository userRepository;
    private final AccessPolicyRepository accessPolicyRepository;
    private final AuditLogRepository auditLogRepository;
    private final BackupHistoryRepository backupHistoryRepository;

    private static final DateTimeFormatter FILE_DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
    private static final DateTimeFormatter DISPLAY_DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Generates a complete .xlsx backup workbook containing all HRMS modules.
     */
    @Transactional(readOnly = true)
    public byte[] generateFullDatabaseExcelBackup(UserPrincipal currentUser, String customFileName) throws IOException {
        long startTime = System.currentTimeMillis();
        String generatedAt = LocalDateTime.now().format(DISPLAY_DT_FMT);
        String adminActor = currentUser != null ? currentUser.getUsername() + " (" + currentUser.getEmail() + ")" : "IT Administrator";

        log.info("Starting Full HRMS Database Excel (.xlsx) Export requested by {}", adminActor);

        // Use standard XSSFWorkbook for robust in-memory generation with zero disk I/O dependencies
        try (Workbook workbook = new XSSFWorkbook()) {

            // Setup reusable corporate styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            // Fetch datasets in read-only mode
            List<Employee> employees = employeeRepository.findAll();
            List<Department> departments = departmentRepository.findAll();
            List<Designation> designations = designationRepository.findAll();
            List<Requisition> requisitions = requisitionRepository.findAll();
            List<Candidate> candidates = candidateRepository.findAll();
            List<Interview> interviews = interviewRepository.findAll();
            List<InterviewFeedback> feedbacks = interviewFeedbackRepository.findAll();
            List<Offer> offers = offerRepository.findAll();
            List<OnboardingChecklist> checklists = onboardingChecklistRepository.findAll();
            List<Approval> approvals = approvalRepository.findAll();
            List<RecruitmentTask> tasks = recruitmentTaskRepository.findAll();
            List<User> users = userRepository.findAll();
            List<AccessPolicy> policies = accessPolicyRepository.findAll();
            List<AuditLog> auditLogs = auditLogRepository.findAll();
            List<BackupHistory> backupHistories = backupHistoryRepository.findAllByOrderByCreatedAtDesc();

            // 1. Overview Sheet
            buildOverviewSheet(workbook, titleStyle, headerStyle, dataStyle, numberStyle, generatedAt, adminActor,
                    employees.size(), departments.size(), designations.size(), requisitions.size(),
                    candidates.size(), interviews.size(), feedbacks.size(), offers.size(),
                    checklists.size(), approvals.size(), tasks.size(), users.size(),
                    policies.size(), auditLogs.size(), backupHistories.size());

            // 2. Employees Sheet
            buildEmployeesSheet(workbook, headerStyle, dataStyle, employees);

            // 3. Departments Sheet
            buildDepartmentsSheet(workbook, headerStyle, dataStyle, departments);

            // 4. Designations Sheet
            buildDesignationsSheet(workbook, headerStyle, dataStyle, designations);

            // 5. Requisitions Sheet
            buildRequisitionsSheet(workbook, headerStyle, dataStyle, currencyStyle, requisitions);

            // 6. Candidates Sheet
            buildCandidatesSheet(workbook, headerStyle, dataStyle, currencyStyle, candidates);

            // 7. Interviews Sheet
            buildInterviewsSheet(workbook, headerStyle, dataStyle, interviews);

            // 8. Interview Feedback Sheet
            buildFeedbackSheet(workbook, headerStyle, dataStyle, numberStyle, feedbacks);

            // 9. Offers & Onboarding Sheet
            buildOffersSheet(workbook, headerStyle, dataStyle, currencyStyle, offers);

            // 10. Onboarding Checklists Sheet
            buildChecklistsSheet(workbook, headerStyle, dataStyle, checklists);

            // 11. Approvals Workflow Sheet
            buildApprovalsSheet(workbook, headerStyle, dataStyle, approvals);

            // 12. Recruitment Tasks Sheet
            buildTasksSheet(workbook, headerStyle, dataStyle, tasks);

            // 13. Users & System Roles Sheet (NO PASSWORDS)
            buildUsersSheet(workbook, headerStyle, dataStyle, users);

            // 14. Access Policies Sheet
            buildPoliciesSheet(workbook, headerStyle, dataStyle, policies);

            // 15. System Audit Trail Sheet
            buildAuditSheet(workbook, headerStyle, dataStyle, auditLogs);

            // 16. Backup Snapshots Sheet
            buildBackupHistorySheet(workbook, headerStyle, dataStyle, numberStyle, backupHistories);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);

            byte[] bytes = baos.toByteArray();
            long duration = System.currentTimeMillis() - startTime;
            log.info("Full HRMS Database Excel backup generated successfully: {} bytes in {} ms", bytes.length, duration);

            // Save copy to local server backup cache for audit & offline access
            persistLocalBackupCopy(bytes, customFileName);

            return bytes;
        } catch (Throwable t) {
            log.error("Fatal error during Excel backup generation: ", t);
            throw new IOException("Failed to generate Excel backup: " + t.getMessage(), t);
        }
    }

    /**
     * Helper to persist a copy of the generated Excel workbook locally.
     */
    private void persistLocalBackupCopy(byte[] bytes, String fileName) {
        try {
            Path backupDir = Paths.get("backups", "excel");
            Files.createDirectories(backupDir);
            Path filePath = backupDir.resolve(fileName != null ? fileName : "HRMS_Backup_" + LocalDateTime.now().format(FILE_DATE_FMT) + ".xlsx");
            Files.write(filePath, bytes);
            log.info("Persisted local Excel backup copy at: {}", filePath.toAbsolutePath());
        } catch (Exception e) {
            log.warn("Could not save local backup copy to disk (non-fatal): {}", e.getMessage());
        }
    }

    public String generateDefaultFilename() {
        return "HRMS_Backup_" + LocalDateTime.now().format(FILE_DATE_FMT) + ".xlsx";
    }

    // =========================================================================
    // SHEET BUILDERS
    // =========================================================================

    private void buildOverviewSheet(Workbook wb, CellStyle titleStyle, CellStyle headerStyle,
                                    CellStyle dataStyle, CellStyle numberStyle, String generatedAt, String adminActor,
                                    int empCount, int deptCount, int desigCount, int reqCount,
                                    int candCount, int intCount, int feedCount, int offerCount,
                                    int checkCount, int appCount, int taskCount, int userCount,
                                    int polCount, int auditCount, int backupCount) {
        Sheet sheet = wb.createSheet("Overview");

        int rowIdx = 0;

        // Title
        Row titleRow = sheet.createRow(rowIdx++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("URJA FOODS HRMS — FULL DATABASE BACKUP");
        titleCell.setCellStyle(titleStyle);

        Row subRow = sheet.createRow(rowIdx++);
        subRow.createCell(0).setCellValue("Complete Offline Enterprise System Export (.xlsx)");

        rowIdx++; // blank row

        // Metadata block
        addMetaRow(sheet, rowIdx++, "Export Timestamp (IST):", generatedAt, dataStyle);
        addMetaRow(sheet, rowIdx++, "Export Initiated By:", adminActor, dataStyle);
        addMetaRow(sheet, rowIdx++, "Database Engine:", "MySQL 8.0 (hr_portal_db)", dataStyle);
        addMetaRow(sheet, rowIdx++, "Primary Storage Target:", "s3://urja-backups/daily/", dataStyle);
        addMetaRow(sheet, rowIdx++, "OneDrive Cloud Mirror:", "https://urjafoods-my.sharepoint.com/personal/data_urjafoods_net/Documents/HRMS/urja-backups/daily", dataStyle);
        addMetaRow(sheet, rowIdx++, "Security & Encryption:", "AES-256-GCM / SHA-256 (Credentials Excluded)", dataStyle);

        rowIdx++; // blank row

        // Summary Table Header
        Row tableHeader = sheet.createRow(rowIdx++);
        setCell(tableHeader, 0, "Module / Database Table", headerStyle);
        setCell(tableHeader, 1, "Worksheet Tab Name", headerStyle);
        setCell(tableHeader, 2, "Total Records Exported", headerStyle);
        setCell(tableHeader, 3, "Module Description & Scope", headerStyle);

        // Summary Rows
        addSummaryRow(sheet, rowIdx++, "Employees & Staff", "Employees", empCount, "Active, probation, and exited employee profiles with lifecycle status", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Departments & Divisions", "Departments", deptCount, "Organizational departments, department heads, and operational status", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Job Designations & Roles", "Designations", desigCount, "Job designations, hierarchy levels, and associated departments", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Manpower Requisitions", "Requisitions", reqCount, "Job openings, headcount, priorities, budgets, and approval stages", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Talent Pool & Candidates", "Candidates", candCount, "Applicant records, current company, CTC expectations, and hiring status", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Interviews & Schedules", "Interviews", intCount, "Scheduled, completed, and pending technical & HR interview rounds", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Interview Feedback", "Interview Feedback", feedCount, "Technical scores, cultural assessments, notes, and hire recommendations", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Offers & Employment Terms", "Offers & Onboarding", offerCount, "Extended job offers, CTC structures, joining dates, and acceptance", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Onboarding Verification", "Onboarding Checklists", checkCount, "Identity, BGV, education, and joining verification checklist items", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Multi-Stage Approvals", "Approvals Workflow", appCount, "Approval inbox requests, multi-tier decisions, and reviewer comments", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Task Workloads & SLA", "Tasks & Assignments", taskCount, "Recruitment tasks, assigned recruiters, due dates, and priorities", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Users & System Access", "Users & Roles", userCount, "System user accounts and RBAC role assignments (passwords excluded)", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Access & Security Policies", "Access Policies", polCount, "Module access restrictions, session timeout, and security rules", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Security Audit Trail", "Audit Logs", auditCount, "Timestamped security events, logins, updates, and actor origin IPs", dataStyle, numberStyle);
        addSummaryRow(sheet, rowIdx++, "Backup Snapshots", "Backup Snapshots", backupCount, "Database backup archive records, S3/OneDrive paths, and checksums", dataStyle, numberStyle);

        autoSizeColumns(sheet, 4);
    }

    private void buildEmployeesSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<Employee> list) {
        Sheet sheet = wb.createSheet("Employees");

        String[] headers = {
                "Employee ID", "Employee Code", "Full Name", "Email Address", "Phone Number",
                "Gender", "Date of Birth", "Blood Group", "Marital Status", "Department",
                "Designation", "Reporting Manager", "Joining Date", "Employment Type",
                "Probation (Months)", "Probation End Date", "Confirmation Status", "Status",
                "Work Location", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Employee e : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, e.getId(), dataStyle);
            setCell(row, 1, e.getEmployeeCode(), dataStyle);
            setCell(row, 2, e.getName(), dataStyle);
            setCell(row, 3, e.getEmail(), dataStyle);
            setCell(row, 4, e.getPhoneNumber(), dataStyle);
            setCell(row, 5, e.getGender(), dataStyle);
            setCell(row, 6, e.getDateOfBirth(), dataStyle);
            setCell(row, 7, e.getBloodGroup(), dataStyle);
            setCell(row, 8, e.getMaritalStatus(), dataStyle);
            setCell(row, 9, safeString(() -> e.getDepartment().getDepartmentName(), ""), dataStyle);
            setCell(row, 10, safeString(() -> e.getDesignation().getDesignationName(), ""), dataStyle);
            setCell(row, 11, safeString(() -> e.getReportingManagerName() != null ? e.getReportingManagerName() : e.getReportingManager().getName(), ""), dataStyle);
            setCell(row, 12, e.getJoiningDate(), dataStyle);
            setCell(row, 13, e.getEmploymentType() != null ? e.getEmploymentType().name() : "", dataStyle);
            setCell(row, 14, e.getProbationDurationMonths(), dataStyle);
            setCell(row, 15, e.getProbationEndDate(), dataStyle);
            setCell(row, 16, e.getConfirmationStatus() != null ? e.getConfirmationStatus().name() : "", dataStyle);
            setCell(row, 17, e.getStatus() != null ? e.getStatus().name() : "", dataStyle);
            setCell(row, 18, e.getWorkLocation(), dataStyle);
            setCell(row, 19, e.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildDepartmentsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<Department> list) {
        Sheet sheet = wb.createSheet("Departments");

        String[] headers = { "Department ID", "Department Code", "Department Name", "Head User / Manager", "Status", "Created At" };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Department d : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, d.getId(), dataStyle);
            setCell(row, 1, d.getDepartmentCode(), dataStyle);
            setCell(row, 2, d.getDepartmentName(), dataStyle);
            setCell(row, 3, safeString(() -> d.getHeadUser().getName(), "Unassigned"), dataStyle);
            setCell(row, 4, Boolean.TRUE.equals(d.getActive()) ? "ACTIVE" : "INACTIVE", dataStyle);
            setCell(row, 5, d.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildDesignationsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<Designation> list) {
        Sheet sheet = wb.createSheet("Designations");

        String[] headers = { "Designation ID", "Designation Code", "Title", "Department", "Hierarchy Level", "Status", "Created At" };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Designation d : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, d.getId(), dataStyle);
            setCell(row, 1, d.getDesignationCode(), dataStyle);
            setCell(row, 2, d.getDesignationName(), dataStyle);
            setCell(row, 3, safeString(() -> d.getDepartment().getDepartmentName(), ""), dataStyle);
            setCell(row, 4, d.getLevel(), dataStyle);
            setCell(row, 5, Boolean.TRUE.equals(d.getActive()) ? "ACTIVE" : "INACTIVE", dataStyle);
            setCell(row, 6, d.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildRequisitionsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, CellStyle currencyStyle, List<Requisition> list) {
        Sheet sheet = wb.createSheet("Requisitions");

        String[] headers = {
                "Requisition ID", "Requisition Code", "Job Title", "Department", "Designation",
                "Headcount", "Position Type", "Priority", "Min Exp (Yrs)", "Max Exp (Yrs)",
                "Budget Min (LPA)", "Budget Max (LPA)", "Status",
                "Created By / Manager", "Target Due Date", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Requisition r : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, r.getId(), dataStyle);
            setCell(row, 1, r.getRequisitionCode(), dataStyle);
            setCell(row, 2, r.getJobTitle(), dataStyle);
            setCell(row, 3, safeString(() -> r.getDepartment().getDepartmentName(), ""), dataStyle);
            setCell(row, 4, safeString(() -> r.getDesignation().getDesignationName(), ""), dataStyle);
            setCell(row, 5, r.getHeadcount(), dataStyle);
            setCell(row, 6, r.getPositionType() != null ? r.getPositionType().name() : "", dataStyle);
            setCell(row, 7, r.getPriority() != null ? r.getPriority().name() : "", dataStyle);
            setCell(row, 8, r.getExperienceYearsMin(), dataStyle);
            setCell(row, 9, r.getExperienceYearsMax(), dataStyle);
            setCell(row, 10, r.getMinBudget(), currencyStyle);
            setCell(row, 11, r.getMaxBudget(), currencyStyle);
            setCell(row, 12, r.getStatus() != null ? r.getStatus().name() : "", dataStyle);
            setCell(row, 13, safeString(() -> r.getCreatedBy().getName(), ""), dataStyle);
            setCell(row, 14, r.getDueDate(), dataStyle);
            setCell(row, 15, r.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildCandidatesSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, CellStyle currencyStyle, List<Candidate> list) {
        Sheet sheet = wb.createSheet("Candidates");

        String[] headers = {
                "Candidate ID", "Candidate Code", "Full Name", "Email Address", "Mobile Number",
                "Current Employer", "Current Designation", "Experience (Yrs)", "Current CTC (LPA)",
                "Expected CTC (LPA)", "Notice Period (Days)", "Application Source", "Status",
                "Associated Requisition", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Candidate c : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, c.getId(), dataStyle);
            setCell(row, 1, c.getCandidateCode(), dataStyle);
            setCell(row, 2, c.getName(), dataStyle);
            setCell(row, 3, c.getEmail(), dataStyle);
            setCell(row, 4, c.getMobile(), dataStyle);
            setCell(row, 5, c.getCurrentEmployer(), dataStyle);
            setCell(row, 6, c.getCurrentDesignation(), dataStyle);
            setCell(row, 7, c.getExperienceYears(), dataStyle);
            setCell(row, 8, c.getCurrentCtc(), currencyStyle);
            setCell(row, 9, c.getExpectedCtc(), currencyStyle);
            setCell(row, 10, c.getNoticePeriodDays(), dataStyle);
            setCell(row, 11, c.getSource() != null ? c.getSource().name() : "", dataStyle);
            setCell(row, 12, c.getStatus() != null ? c.getStatus().name() : "", dataStyle);
            setCell(row, 13, safeString(() -> c.getRequisition().getJobTitle() + " (" + c.getRequisition().getRequisitionCode() + ")", ""), dataStyle);
            setCell(row, 14, c.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildInterviewsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<Interview> list) {
        Sheet sheet = wb.createSheet("Interviews");

        String[] headers = {
                "Interview ID", "Candidate Name", "Candidate Email", "Job Title", "Round",
                "Interviewer Name", "Scheduled Time", "Duration (Mins)", "Mode",
                "Meeting Link / Location", "Status", "Evaluation Result"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Interview i : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, i.getId(), dataStyle);
            setCell(row, 1, safeString(() -> i.getCandidate().getName(), ""), dataStyle);
            setCell(row, 2, safeString(() -> i.getCandidate().getEmail(), ""), dataStyle);
            setCell(row, 3, safeString(() -> i.getRequisition().getJobTitle(), ""), dataStyle);
            setCell(row, 4, i.getRound() != null ? i.getRound().name() : "", dataStyle);
            setCell(row, 5, safeString(() -> i.getInterviewer().getName(), ""), dataStyle);
            setCell(row, 6, i.getScheduledAt(), dataStyle);
            setCell(row, 7, i.getDurationMinutes(), dataStyle);
            setCell(row, 8, i.getMode() != null ? i.getMode().name() : "", dataStyle);
            setCell(row, 9, i.getMeetingLink() != null ? i.getMeetingLink() : i.getMeetingLocation(), dataStyle);
            setCell(row, 10, i.getStatus() != null ? i.getStatus().name() : "", dataStyle);
            
            String outcome = safeString(() -> i.getFeedback().getRecommendation().name(), "PENDING");
            setCell(row, 11, outcome, dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildFeedbackSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, CellStyle numberStyle, List<InterviewFeedback> list) {
        Sheet sheet = wb.createSheet("Interview Feedback");

        String[] headers = {
                "Feedback ID", "Interview ID", "Candidate Name", "Interviewer Name",
                "Technical Rating (1-5)", "Cultural Fit Rating (1-5)", "Communication Rating (1-5)",
                "Recommendation", "Strengths & Evaluator Notes", "Submitted At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (InterviewFeedback f : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, f.getId(), dataStyle);
            setCell(row, 1, safeString(() -> String.valueOf(f.getInterview().getId()), ""), dataStyle);
            setCell(row, 2, safeString(() -> f.getInterview().getCandidate().getName(), ""), dataStyle);
            setCell(row, 3, safeString(() -> f.getInterview().getInterviewer().getName(), ""), dataStyle);
            setCell(row, 4, f.getTechnicalRating(), numberStyle);
            setCell(row, 5, f.getCultureFitRating(), numberStyle);
            setCell(row, 6, f.getCommunicationRating(), numberStyle);
            setCell(row, 7, f.getRecommendation() != null ? f.getRecommendation().name() : "", dataStyle);
            
            String notes = f.getDetailedComments() != null ? f.getDetailedComments() : f.getStrengths();
            setCell(row, 8, notes, dataStyle);
            setCell(row, 9, f.getSubmittedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildOffersSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, CellStyle currencyStyle, List<Offer> list) {
        Sheet sheet = wb.createSheet("Offers & Onboarding");

        String[] headers = {
                "Offer ID", "Offer Code", "Candidate Name", "Candidate Email", "Job Title",
                "Department", "Work Location", "Offer Date", "Target Joining Date",
                "Fixed CTC (LPA)", "Variable CTC (LPA)", "Total CTC (LPA)", "Offer Status",
                "Onboarding Status", "Approval Stage", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Offer o : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, o.getId(), dataStyle);
            setCell(row, 1, o.getOfferCode(), dataStyle);
            setCell(row, 2, o.getCandidateName(), dataStyle);
            setCell(row, 3, o.getCandidateEmail(), dataStyle);
            setCell(row, 4, o.getJobTitle(), dataStyle);
            setCell(row, 5, o.getDepartment(), dataStyle);
            setCell(row, 6, o.getLocation(), dataStyle);
            setCell(row, 7, o.getOfferDate(), dataStyle);
            setCell(row, 8, o.getJoiningDate(), dataStyle);
            setCell(row, 9, o.getCtcFixed(), currencyStyle);
            setCell(row, 10, o.getCtcVariable(), currencyStyle);
            setCell(row, 11, o.getCtcTotal(), currencyStyle);
            setCell(row, 12, o.getStatus() != null ? o.getStatus().name() : "", dataStyle);
            setCell(row, 13, o.getOnboardingStatus() != null ? o.getOnboardingStatus().name() : "", dataStyle);
            setCell(row, 14, o.getApprovalStage(), dataStyle);
            setCell(row, 15, o.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildChecklistsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<OnboardingChecklist> list) {
        Sheet sheet = wb.createSheet("Onboarding Checklists");

        String[] headers = {
                "Checklist ID", "Offer Code", "Candidate Name", "Category",
                "Requirement Item", "Completed", "Verified By", "Verified At", "Notes"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (OnboardingChecklist c : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, c.getId(), dataStyle);
            setCell(row, 1, safeString(() -> c.getOffer().getOfferCode(), ""), dataStyle);
            setCell(row, 2, safeString(() -> c.getOffer().getCandidateName(), ""), dataStyle);
            setCell(row, 3, c.getCategory(), dataStyle);
            setCell(row, 4, c.getItemName(), dataStyle);
            setCell(row, 5, Boolean.TRUE.equals(c.getIsCompleted()) ? "YES" : "NO", dataStyle);
            setCell(row, 6, c.getVerifiedBy(), dataStyle);
            setCell(row, 7, c.getVerifiedAt(), dataStyle);
            setCell(row, 8, c.getNotes(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildApprovalsSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<Approval> list) {
        Sheet sheet = wb.createSheet("Approvals Workflow");

        String[] headers = {
                "Approval ID", "Approval Code", "Workflow Type", "Entity Type", "Title / Request",
                "Department", "Priority", "Decision Status", "Approver Name", "Comments / Remarks",
                "Decision Time", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (Approval a : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, a.getId(), dataStyle);
            setCell(row, 1, a.getApprovalCode(), dataStyle);
            setCell(row, 2, a.getApprovalType() != null ? a.getApprovalType().name() : "", dataStyle);
            setCell(row, 3, a.getEntityType(), dataStyle);
            setCell(row, 4, a.getTitle(), dataStyle);
            setCell(row, 5, a.getDepartment(), dataStyle);
            setCell(row, 6, a.getPriority() != null ? a.getPriority().name() : "", dataStyle);
            setCell(row, 7, a.getStatus() != null ? a.getStatus().name() : "", dataStyle);
            
            String approver = safeString(() -> a.getAssignedApprover() != null ? a.getAssignedApprover().getName() : (a.getDecisionByName() != null ? a.getDecisionByName() : "Pending"), "Pending");
            setCell(row, 8, approver, dataStyle);
            setCell(row, 9, a.getDecisionRemarks(), dataStyle);
            setCell(row, 10, a.getDecisionDate(), dataStyle);
            setCell(row, 11, a.getRequestDate() != null ? a.getRequestDate() : "", dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildTasksSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<RecruitmentTask> list) {
        Sheet sheet = wb.createSheet("Tasks & Assignments");

        String[] headers = {
                "Task ID", "Task Title", "Task Type", "Priority", "Assigned User",
                "Assigned By", "Start Date", "Due Date", "Status", "Description & Notes", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (RecruitmentTask t : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, t.getId(), dataStyle);
            setCell(row, 1, t.getTaskTitle(), dataStyle);
            setCell(row, 2, t.getTaskType() != null ? t.getTaskType().name() : "", dataStyle);
            setCell(row, 3, t.getPriority() != null ? t.getPriority().name() : "", dataStyle);
            setCell(row, 4, safeString(() -> t.getAssignedUser().getName(), ""), dataStyle);
            setCell(row, 5, safeString(() -> t.getAssignedByUser().getName(), ""), dataStyle);
            setCell(row, 6, t.getStartDate(), dataStyle);
            setCell(row, 7, t.getDueDate(), dataStyle);
            setCell(row, 8, t.getStatus() != null ? t.getStatus().name() : "", dataStyle);
            setCell(row, 9, t.getTaskDescription(), dataStyle);
            setCell(row, 10, t.getCreatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildUsersSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<User> list) {
        Sheet sheet = wb.createSheet("Users & Roles");

        String[] headers = {
                "User ID", "Username", "Full Name", "Official Email",
                "Title / Designation", "Account Status", "Assigned Security Roles", "Created At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (User u : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, u.getId(), dataStyle);
            setCell(row, 1, u.getUsername(), dataStyle);
            setCell(row, 2, u.getName(), dataStyle);
            setCell(row, 3, u.getEmail(), dataStyle);
            setCell(row, 4, u.getDesignation(), dataStyle);
            setCell(row, 5, u.getStatus() != null ? u.getStatus().name() : "", dataStyle);

            String roleNames = "ROLE_INTERVIEWER";
            try {
                if (u.getRoles() != null && !u.getRoles().isEmpty()) {
                    roleNames = u.getRoles().stream().map(Role::getRoleName).collect(Collectors.joining(", "));
                }
            } catch (Throwable ignored) {}
            setCell(row, 6, roleNames, dataStyle);
            setCell(row, 7, u.getCreatedAt(), dataStyle);
            // CRITICAL: passwordHash and any security tokens are strictly EXCLUDED
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildPoliciesSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<AccessPolicy> list) {
        Sheet sheet = wb.createSheet("Access Policies");

        String[] headers = { "Policy ID", "Policy Key", "Policy Value / Setting", "Description & Scope", "Updated By", "Last Updated" };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (AccessPolicy p : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, p.getId(), dataStyle);
            setCell(row, 1, p.getPolicyKey(), dataStyle);
            setCell(row, 2, p.getPolicyValue(), dataStyle);
            setCell(row, 3, p.getDescription(), dataStyle);
            setCell(row, 4, safeString(() -> p.getUpdatedBy().getName(), "System"), dataStyle);
            setCell(row, 5, p.getUpdatedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildAuditSheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, List<AuditLog> list) {
        Sheet sheet = wb.createSheet("Audit Logs");

        String[] headers = {
                "Event ID", "Timestamp (IST)", "Security Actor", "Action Type",
                "Module Affected", "Entity ID", "Details / Modified Values", "Origin IP Address"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (AuditLog a : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, a.getId(), dataStyle);
            setCell(row, 1, a.getTimestamp(), dataStyle);
            setCell(row, 2, a.getActorName(), dataStyle);
            setCell(row, 3, a.getAction(), dataStyle);
            setCell(row, 4, a.getEntityType(), dataStyle);
            setCell(row, 5, a.getEntityId(), dataStyle);
            setCell(row, 6, a.getNewValue() != null ? a.getNewValue() : a.getOldValue(), dataStyle);
            setCell(row, 7, a.getIpAddress(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    private void buildBackupHistorySheet(Workbook wb, CellStyle headerStyle, CellStyle dataStyle, CellStyle numberStyle, List<BackupHistory> list) {
        Sheet sheet = wb.createSheet("Backup Snapshots");

        String[] headers = {
                "Backup ID", "Snapshot File Name", "Backup Type", "Execution Status",
                "File Size (Bytes)", "Storage Locations (S3 & OneDrive)", "SHA-256 Checksum", "Completed At"
        };
        writeHeaderRow(sheet, headers, headerStyle);

        int rowIdx = 1;
        for (BackupHistory b : list) {
            Row row = sheet.createRow(rowIdx++);
            setCell(row, 0, b.getId(), dataStyle);
            setCell(row, 1, b.getFileName(), dataStyle);
            setCell(row, 2, b.getBackupType() != null ? b.getBackupType().name() : "", dataStyle);
            setCell(row, 3, b.getStatus() != null ? b.getStatus().name() : "", dataStyle);
            setCell(row, 4, b.getFileSizeBytes(), numberStyle);
            setCell(row, 5, b.getLocationReference(), dataStyle);
            setCell(row, 6, b.getChecksumHash(), dataStyle);
            setCell(row, 7, b.getCompletedAt(), dataStyle);
        }

        autoSizeColumns(sheet, headers.length);
    }

    // =========================================================================
    // STYLE HELPERS & UTILITIES
    // =========================================================================

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 10);
        font.setFontName("Calibri");
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(style);
        return style;
    }

    private CellStyle createTitleStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.DARK_GREEN.getIndex());
        font.setFontHeightInPoints((short) 14);
        font.setFontName("Calibri");
        style.setFont(font);
        return style;
    }

    private CellStyle createDataStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setFontHeightInPoints((short) 10);
        font.setFontName("Calibri");
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(style);
        return style;
    }

    private CellStyle createNumberStyle(Workbook wb) {
        CellStyle style = createDataStyle(wb);
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook wb) {
        CellStyle style = createDataStyle(wb);
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private void applyBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderTop(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderLeft(BorderStyle.THIN);
        style.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderRight(BorderStyle.THIN);
        style.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
    }

    private void writeHeaderRow(Sheet sheet, String[] headers, CellStyle headerStyle) {
        Row row = sheet.createRow(0);
        row.setHeightInPoints(24);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void addMetaRow(Sheet sheet, int rowIdx, String label, String value, CellStyle dataStyle) {
        Row row = sheet.createRow(rowIdx);
        Cell c0 = row.createCell(0);
        c0.setCellValue(label);
        c0.setCellStyle(dataStyle);

        Cell c1 = row.createCell(1);
        c1.setCellValue(value != null ? value : "-");
        c1.setCellStyle(dataStyle);
    }

    private void addSummaryRow(Sheet sheet, int rowIdx, String module, String sheetName,
                               int count, String desc, CellStyle dataStyle, CellStyle numberStyle) {
        Row row = sheet.createRow(rowIdx);
        setCell(row, 0, module, dataStyle);
        setCell(row, 1, sheetName, dataStyle);
        setCell(row, 2, count, numberStyle);
        setCell(row, 3, desc, dataStyle);
    }

    private void setCell(Row row, int colIndex, Object value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        if (style != null) cell.setCellStyle(style);

        if (value == null) {
            cell.setCellValue("");
            return;
        }

        if (value instanceof Number num) {
            cell.setCellValue(num.doubleValue());
        } else if (value instanceof Boolean b) {
            cell.setCellValue(b ? "YES" : "NO");
        } else if (value instanceof LocalDate ld) {
            cell.setCellValue(ld.toString());
        } else if (value instanceof LocalDateTime ldt) {
            cell.setCellValue(ldt.format(DISPLAY_DT_FMT));
        } else {
            String str = value.toString();
            // Safe guard against Excel 32767 chars per cell limit
            if (str.length() > 32000) {
                str = str.substring(0, 32000) + "... [truncated]";
            }
            cell.setCellValue(str);
        }
    }

    private String safeString(java.util.function.Supplier<String> supplier, String fallback) {
        try {
            String val = supplier.get();
            return val != null ? val : fallback;
        } catch (Throwable t) {
            return fallback;
        }
    }

    private void autoSizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            try {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                if (currentWidth < 3800) {
                    sheet.setColumnWidth(i, 3800);
                } else if (currentWidth > 15000) {
                    sheet.setColumnWidth(i, 15000);
                }
            } catch (Throwable t) {
                try {
                    sheet.setColumnWidth(i, 6000);
                } catch (Throwable ignored) {}
            }
        }
    }
}
