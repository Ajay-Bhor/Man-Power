package com.company.hr.service;

import com.company.hr.dto.RecruiterAssignRequest;
import com.company.hr.dto.RequisitionRequest;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.dto.TatSummaryResponse;
import com.company.hr.entity.*;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.exception.UnauthorizedWorkflowActionException;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RequisitionService {

    private final RequisitionRepository requisitionRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RequisitionHistoryRepository historyRepository;
    private final TatCalculationService tatCalculationService;
    private final NotificationService notificationService;
    private final AccessPolicyService accessPolicyService;

    @Transactional
    public RequisitionResponse createRequisition(RequisitionRequest request, UserPrincipal currentUser) {
        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + request.getDepartmentId()));

        Designation designation = designationRepository.findById(request.getDesignationId())
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found with ID: " + request.getDesignationId()));

        Employee replacementFor = null;
        if (request.getPositionType() == Requisition.PositionType.REPLACEMENT && request.getReplacementForEmployeeId() != null) {
            replacementFor = employeeRepository.findById(request.getReplacementForEmployeeId()).orElse(null);
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String code = "REQ-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        Requisition requisition = Requisition.builder()
                .requisitionCode(code)
                .jobTitle(request.getJobTitle())
                .department(department)
                .designation(designation)
                .headcount(request.getHeadcount())
                .positionType(request.getPositionType())
                .replacementForEmployee(replacementFor)
                .priority(request.getPriority())
                .experienceYearsMin(request.getExperienceYearsMin() != null ? request.getExperienceYearsMin() : 1)
                .experienceYearsMax(request.getExperienceYearsMax() != null ? request.getExperienceYearsMax() : 5)
                .minBudget(request.getMinBudget())
                .maxBudget(request.getMaxBudget())
                .jobDescription(request.getJobDescription())
                .justification(request.getJustification())
                .status(Requisition.RequisitionStatus.PENDING_HR_REVIEW)
                .createdBy(user)
                .tatTargetDays(30)
                .build();

        requisition = requisitionRepository.save(requisition);

        // Record History
        recordHistory(requisition, "CREATED", "PENDING_HR_REVIEW", "Requisition created and submitted for HR review", user);

        // Notify HR Admins
        notificationService.notifyRole("ROLE_HR_ADMIN", "New Requisition Submitted",
                "Requisition " + requisition.getRequisitionCode() + " (" + requisition.getJobTitle() + ") awaits initial HR review.",
                "/requisitions/" + requisition.getId());

        return mapToResponse(requisition);
    }

    @Transactional(readOnly = true)
    public Page<RequisitionResponse> getAllRequisitions(Pageable pageable, UserPrincipal currentUser) {
        if (currentUser == null) {
            return requisitionRepository.findAll(pageable).map(this::mapToResponse);
        }

        List<String> roles = currentUser.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .toList();
        boolean isHRAdmin = roles.contains("ROLE_HR_ADMIN");
        boolean isRecruiter = roles.contains("ROLE_HR_RECRUITER");
        boolean isInterviewer = roles.contains("ROLE_INTERVIEWER");
        boolean isDeptHead = roles.contains("ROLE_DEPT_HEAD");

        if (isRecruiter && !isHRAdmin) {
            return requisitionRepository.findByAssignedRecruiterId(currentUser.getId(), pageable).map(this::mapToResponse);
        }
        if (isInterviewer && !isHRAdmin) {
            return requisitionRepository.findByInterviewerId(currentUser.getId(), pageable).map(this::mapToResponse);
        }
        if (isDeptHead && currentUser.getDepartmentRestrictionId() != null) {
            return requisitionRepository.findByDepartmentId(currentUser.getDepartmentRestrictionId(), pageable).map(this::mapToResponse);
        }

        return requisitionRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public RequisitionResponse getRequisitionById(Long id) {
        Requisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requisition not found with ID: " + id));
        return mapToResponse(requisition);
    }

    @Transactional
    public RequisitionResponse assignRecruiter(Long id, RecruiterAssignRequest request, UserPrincipal currentUser) {
        if (currentUser != null && !accessPolicyService.canUserAssignRecruiters(currentUser)) {
            throw new org.springframework.security.access.AccessDeniedException("User role is not authorized to assign recruiters to requisitions");
        }

        Requisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requisition not found with ID: " + id));

        if (requisition.getStatus() != Requisition.RequisitionStatus.APPROVED
                && requisition.getStatus() != Requisition.RequisitionStatus.RECRUITER_ASSIGNED
                && requisition.getStatus() != Requisition.RequisitionStatus.SOURCING) {
            throw new UnauthorizedWorkflowActionException("Cannot assign recruiter to requisition with status: " + requisition.getStatus());
        }

        User recruiter = userRepository.findById(request.getRecruiterId())
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter not found with ID: " + request.getRecruiterId()));

        User adminUser = userRepository.findById(currentUser.getId()).orElse(null);

        LocalDate tatStart = request.getTatStartDate() != null ? request.getTatStartDate() : LocalDate.now();
        int targetDays = request.getTargetDays() != null && request.getTargetDays() > 0 ? request.getTargetDays() : 30;
        LocalDate dueDate = tatCalculationService.calculateDueDate(tatStart, targetDays);

        String oldStatus = requisition.getStatus().name();
        requisition.setAssignedRecruiter(recruiter);
        requisition.setTatStartDate(tatStart);
        requisition.setTatTargetDays(targetDays);
        requisition.setDueDate(dueDate);
        requisition.setStatus(Requisition.RequisitionStatus.RECRUITER_ASSIGNED);

        requisition = requisitionRepository.save(requisition);

        recordHistory(requisition, oldStatus, "RECRUITER_ASSIGNED",
                "Assigned to recruiter " + recruiter.getName() + ". 30-Day TAT SLA started. Due: " + dueDate, adminUser);

        // Notify Recruiter
        notificationService.notifyUser(recruiter, "New Requisition Assignment",
                "You have been assigned to " + requisition.getRequisitionCode() + " (" + requisition.getJobTitle() + "). Target SLA: 30 days.",
                "/requisitions/" + requisition.getId());

        return mapToResponse(requisition);
    }

    @Transactional
    public RequisitionResponse updateStatus(Long id, Requisition.RequisitionStatus newStatus, String comment, UserPrincipal currentUser) {
        Requisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requisition not found with ID: " + id));

        User user = userRepository.findById(currentUser.getId()).orElse(null);
        String oldStatus = requisition.getStatus().name();

        if (newStatus == Requisition.RequisitionStatus.FILLED || newStatus == Requisition.RequisitionStatus.CLOSED) {
            requisition.setClosedAt(LocalDateTime.now());
            if (requisition.getTatStartDate() != null) {
                int actualDays = tatCalculationService.calculateDaysElapsed(requisition.getTatStartDate(), LocalDate.now());
                requisition.setActualTatDays(actualDays);
            }
        }

        requisition.setStatus(newStatus);
        requisition = requisitionRepository.save(requisition);

        recordHistory(requisition, oldStatus, newStatus.name(), comment, user);

        return mapToResponse(requisition);
    }

    @Transactional(readOnly = true)
    public List<TatSummaryResponse> getOverdueRequisitions() {
        return requisitionRepository.findOverdueRequisitions(LocalDate.now()).stream()
                .map(tatCalculationService::computeTatSummary)
                .collect(Collectors.toList());
    }

    private void recordHistory(Requisition requisition, String oldStatus, String newStatus, String comment, User user) {
        RequisitionHistory history = RequisitionHistory.builder()
                .requisition(requisition)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .actionComment(comment)
                .changedBy(user)
                .build();
        historyRepository.save(history);
    }

    public RequisitionResponse mapToResponse(Requisition r) {
        TatSummaryResponse tat = tatCalculationService.computeTatSummary(r);

        return RequisitionResponse.builder()
                .id(r.getId())
                .requisitionCode(r.getRequisitionCode())
                .jobTitle(r.getJobTitle())
                .departmentId(r.getDepartment() != null ? r.getDepartment().getId() : null)
                .departmentName(r.getDepartment() != null ? r.getDepartment().getDepartmentName() : null)
                .designationId(r.getDesignation() != null ? r.getDesignation().getId() : null)
                .designationName(r.getDesignation() != null ? r.getDesignation().getDesignationName() : null)
                .headcount(r.getHeadcount())
                .positionType(r.getPositionType())
                .replacementForEmployeeName(r.getReplacementForEmployee() != null ? r.getReplacementForEmployee().getName() : null)
                .priority(r.getPriority())
                .experienceYearsMin(r.getExperienceYearsMin())
                .experienceYearsMax(r.getExperienceYearsMax())
                .minBudget(r.getMinBudget())
                .maxBudget(r.getMaxBudget())
                .jobDescription(r.getJobDescription())
                .justification(r.getJustification())
                .status(r.getStatus())
                .createdByName(r.getCreatedBy() != null ? r.getCreatedBy().getName() : null)
                .assignedRecruiterId(r.getAssignedRecruiter() != null ? r.getAssignedRecruiter().getId() : null)
                .assignedRecruiterName(r.getAssignedRecruiter() != null ? r.getAssignedRecruiter().getName() : null)
                .tatStartDate(r.getTatStartDate())
                .tatTargetDays(r.getTatTargetDays())
                .dueDate(r.getDueDate())
                .elapsedDays(tat.getElapsedDays())
                .daysRemaining(tat.getDaysRemaining())
                .isOverdue(tat.isOverdue())
                .actualTatDays(r.getActualTatDays())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
