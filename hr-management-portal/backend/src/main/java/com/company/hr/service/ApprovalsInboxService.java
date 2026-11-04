package com.company.hr.service;

import com.company.hr.dto.*;
import com.company.hr.entity.*;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.exception.UnauthorizedWorkflowActionException;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalsInboxService {

    private final ApprovalRepository approvalRepository;
    private final ApprovalCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final AuditLogRepository auditLogRepository;
    private final OfferRepository offerRepository;
    private final RequisitionRepository requisitionRepository;
    private final RequisitionHistoryRepository requisitionHistoryRepository;
    private final NotificationService notificationService;

    /**
     * Database-backed summary statistics for the 4 top cards and 5 tabs.
     */
    @Transactional(readOnly = true)
    public ApprovalSummaryStatsDto getSummaryStats(UserPrincipal currentUser) {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();

        long pending = approvalRepository.countByStatus(Approval.ApprovalStatus.PENDING);
        long approvedToday = approvalRepository.countByStatusAndDecisionDateAfter(Approval.ApprovalStatus.APPROVED,
                startOfToday);
        long rejectedToday = approvalRepository.countByStatusAndDecisionDateAfter(Approval.ApprovalStatus.REJECTED,
                startOfToday);

        long myApprovals = currentUser != null
                ? approvalRepository.countMyApprovals(currentUser.getId())
                : 0L;

        // Tabs counts
        long allCount = approvalRepository.count();
        long offerCount = approvalRepository.countByApprovalType(Approval.ApprovalType.OFFER_APPROVAL);
        long reqCount = approvalRepository.countByApprovalType(Approval.ApprovalType.REQUISITION_APPROVAL);
        long hiringCount = approvalRepository.countByApprovalType(Approval.ApprovalType.HIRING_APPROVAL);
        long otherCount = approvalRepository.countByApprovalType(Approval.ApprovalType.OTHER_APPROVAL);

        return ApprovalSummaryStatsDto.builder()
                .pendingApprovals(pending)
                .approvedToday(approvedToday)
                .rejectedToday(rejectedToday)
                .myApprovals(myApprovals)
                .allCount(allCount)
                .offerApprovalsCount(offerCount)
                .requisitionApprovalsCount(reqCount)
                .hiringApprovalsCount(hiringCount)
                .otherApprovalsCount(otherCount)
                .build();
    }

    /**
     * Filter approvals with pagination, tab, multi-filter dropdowns and global
     * search.
     */
    @Transactional(readOnly = true)
    public Page<ApprovalResponseDto> filterApprovals(
            String tab,
            String type,
            String status,
            String department,
            String requestedBy,
            String search,
            UserPrincipal currentUser,
            Pageable pageable) {

        Specification<Approval> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Tab Filter
            if (tab != null && !tab.equalsIgnoreCase("ALL")) {
                switch (tab.toUpperCase()) {
                    case "OFFER_APPROVALS", "OFFER", "OFFERS" ->
                        predicates.add(cb.equal(root.get("approvalType"), Approval.ApprovalType.OFFER_APPROVAL));
                    case "REQUISITION_APPROVALS", "REQUISITION", "REQUISITIONS" ->
                        predicates.add(cb.equal(root.get("approvalType"), Approval.ApprovalType.REQUISITION_APPROVAL));
                    case "HIRING_APPROVALS", "HIRING" ->
                        predicates.add(cb.equal(root.get("approvalType"), Approval.ApprovalType.HIRING_APPROVAL));
                    case "OTHER_APPROVALS", "OTHER" ->
                        predicates.add(cb.equal(root.get("approvalType"), Approval.ApprovalType.OTHER_APPROVAL));
                }
            }

            // 2. Type Dropdown Filter
            if (type != null && !type.equalsIgnoreCase("ALL") && !type.isBlank()) {
                try {
                    Approval.ApprovalType aType = Approval.ApprovalType.valueOf(type.toUpperCase());
                    predicates.add(cb.equal(root.get("approvalType"), aType));
                } catch (IllegalArgumentException ignored) {
                }
            }

            // 3. Status Filter (Default to PENDING if not specified or specified as
            // PENDING)
            if (status != null && !status.equalsIgnoreCase("ALL") && !status.isBlank()) {
                try {
                    Approval.ApprovalStatus aStatus = Approval.ApprovalStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), aStatus));
                } catch (IllegalArgumentException ignored) {
                }
            }

            // 4. Department Filter
            if (department != null && !department.equalsIgnoreCase("ALL") && !department.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("department")), department.toLowerCase().trim()));
            }

            // 5. Requested By Filter
            if (requestedBy != null && !requestedBy.equalsIgnoreCase("ALL") && !requestedBy.isBlank()) {
                predicates.add(
                        cb.like(cb.lower(root.get("requesterName")), "%" + requestedBy.toLowerCase().trim() + "%"));
            }

            // 6. Global Search
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase().trim() + "%";
                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("candidateName")), pattern),
                        cb.like(cb.lower(root.get("jobTitle")), pattern),
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("subtitle")), pattern),
                        cb.like(cb.lower(root.get("requesterName")), pattern),
                        cb.like(cb.lower(root.get("approvalCode")), pattern));
                predicates.add(searchPredicate);
            }

            // 7. Security / Role Scoping
            if (currentUser != null && !hasSuperAdminRights(currentUser)) {
                if (isDeptHead(currentUser) && currentUser.getDepartmentRestrictionId() != null) {
                    departmentRepository.findById(currentUser.getDepartmentRestrictionId()).ifPresent(dept -> {
                        Predicate deptMatch = cb.equal(cb.lower(root.get("department")),
                                dept.getDepartmentName().toLowerCase());
                        Predicate assignedMatch = cb.equal(root.get("assignedApprover").get("id"), currentUser.getId());
                        predicates.add(cb.or(deptMatch, assignedMatch));
                    });
                } else if (isManagerOrSenior(currentUser)) {
                    Predicate assignedMatch = cb.equal(root.get("assignedApprover").get("id"), currentUser.getId());
                    Predicate requestedMatch = cb.equal(root.get("requestedBy").get("id"), currentUser.getId());
                    Predicate roleMatch = root.get("assignedApproverRole").in("ROLE_APPROVING_MANAGER",
                            "ROLE_SENIOR_MGMT", "ROLE_HR_ADMIN");
                    predicates.add(cb.or(assignedMatch, requestedMatch, roleMatch));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Approval> page = approvalRepository.findAll(spec, pageable);
        return page.map(a -> toDto(a, currentUser));
    }

    /**
     * Get single approval details by ID.
     */
    @Transactional(readOnly = true)
    public ApprovalResponseDto getApprovalById(Long id, UserPrincipal currentUser) {
        Approval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found with ID: " + id));

        return toDto(approval, currentUser);
    }

    /**
     * Process an Approval decision (Approve, Reject, Return for Correction).
     */
    @Transactional
    public ApprovalResponseDto processDecision(Long id, ApprovalDecisionRequest request, UserPrincipal currentUser) {
        Approval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found with ID: " + id));

        if (approval.getStatus() == Approval.ApprovalStatus.APPROVED
                || approval.getStatus() == Approval.ApprovalStatus.REJECTED) {
            throw new BadRequestException(
                    "This approval request has already been finalized as " + approval.getStatus());
        }

        // Authorization check
        if (!canUserDecide(approval, currentUser)) {
            throw new UnauthorizedWorkflowActionException(
                    "You are not authorized to make decisions on this approval request.");
        }

        // Governance Policy: Prevent self-approval (unless IT admin testing)
        if (approval.getRequestedBy() != null && approval.getRequestedBy().getId().equals(currentUser.getId())
                && !isItAdmin(currentUser)) {
            throw new UnauthorizedWorkflowActionException(
                    "Corporate governance policy strictly prohibits approvers from signing off on their own requests.");
        }

        Approval.ApprovalStatus decisionStatus;
        try {
            decisionStatus = Approval.ApprovalStatus.valueOf(request.getDecision().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid decision: " + request.getDecision());
        }

        // Rejection and Return require remarks
        if ((decisionStatus == Approval.ApprovalStatus.REJECTED || decisionStatus == Approval.ApprovalStatus.RETURNED)
                &&
                (request.getRemarks() == null || request.getRemarks().trim().isBlank())) {
            throw new BadRequestException(
                    "A detailed reason or comment is mandatory when rejecting or returning a request.");
        }

        User approverUser = userRepository.findById(currentUser.getId())
                .orElse(null);

        // Update Approval Record
        approval.setStatus(decisionStatus);
        approval.setDecisionBy(approverUser);
        approval.setDecisionByName(currentUser.getName());
        approval.setDecisionDate(LocalDateTime.now());
        approval.setDecisionRemarks(request.getRemarks());

        approvalRepository.save(approval);

        // Record comment if remarks provided
        if (request.getRemarks() != null && !request.getRemarks().trim().isBlank()) {
            ApprovalComment comment = ApprovalComment.builder()
                    .approval(approval)
                    .user(approverUser)
                    .userName(currentUser.getName())
                    .userRole(getPrimaryRoleName(currentUser))
                    .comment("[" + decisionStatus + "] " + request.getRemarks().trim())
                    .build();
            commentRepository.save(comment);
        }

        // Synchronize with related entity (Offer, Requisition, Candidate)
        synchronizeEntityDecision(approval, decisionStatus, request.getRemarks(), currentUser, approverUser);

        // Record in Enterprise Audit Log
        recordAudit(currentUser, decisionStatus.name(), "Approval", approval.getApprovalCode(),
                "Decision '" + decisionStatus + "' recorded by " + currentUser.getName() + ". Remarks: "
                        + request.getRemarks());

        // Send alert notification
        if (approval.getRequestedBy() != null) {
            String msg = "Your approval request for '" + approval.getTitle() + " - " + approval.getSubtitle() +
                    "' was " + decisionStatus.name().toLowerCase() + " by " + currentUser.getName();
            notificationService.notifyUser(approval.getRequestedBy(), "Approval Status Update", msg,
                    "/approvals/" + approval.getId());
        }

        return toDto(approval, currentUser);
    }

    /**
     * Add a comment to an approval request.
     */
    @Transactional
    public ApprovalCommentDto addComment(Long id, ApprovalCommentRequest request, UserPrincipal currentUser) {
        Approval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found with ID: " + id));

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ApprovalComment comment = ApprovalComment.builder()
                .approval(approval)
                .user(user)
                .userName(currentUser.getName())
                .userRole(getPrimaryRoleName(currentUser))
                .comment(request.getComment().trim())
                .build();

        ApprovalComment saved = commentRepository.save(comment);

        // Record in Audit Log
        recordAudit(currentUser, "COMMENT_ADDED", "Approval", approval.getApprovalCode(),
                "Comment posted by " + currentUser.getName() + ": " + request.getComment());

        return ApprovalCommentDto.builder()
                .id(saved.getId())
                .userId(user.getId())
                .userName(saved.getUserName())
                .userRole(saved.getUserRole())
                .comment(saved.getComment())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    private void synchronizeEntityDecision(
            Approval approval,
            Approval.ApprovalStatus decision,
            String remarks,
            UserPrincipal currentUser,
            User approverUser) {

        try {
            if ("OFFER".equalsIgnoreCase(approval.getEntityType()) && approval.getEntityId() != null) {
                offerRepository.findById(approval.getEntityId()).ifPresent(offer -> {
                    if (decision == Approval.ApprovalStatus.APPROVED) {
                        offer.setStatus(Offer.OfferStatus.APPROVED);
                        offer.setApprovalStage("Approved");
                    } else if (decision == Approval.ApprovalStatus.REJECTED) {
                        offer.setStatus(Offer.OfferStatus.WITHDRAWN);
                        offer.setApprovalStage("Rejected");
                        offer.setDeclineReason(remarks);
                    } else if (decision == Approval.ApprovalStatus.RETURNED) {
                        offer.setStatus(Offer.OfferStatus.DRAFT);
                        offer.setApprovalStage("Returned for Correction");
                    }
                    offerRepository.save(offer);
                });
            } else if ("REQUISITION".equalsIgnoreCase(approval.getEntityType()) && approval.getEntityId() != null) {
                requisitionRepository.findById(approval.getEntityId()).ifPresent(req -> {
                    String oldStatus = req.getStatus().name();
                    if (decision == Approval.ApprovalStatus.APPROVED) {
                        req.setStatus(Requisition.RequisitionStatus.APPROVED);
                    } else if (decision == Approval.ApprovalStatus.REJECTED) {
                        req.setStatus(Requisition.RequisitionStatus.REJECTED);
                    } else if (decision == Approval.ApprovalStatus.RETURNED) {
                        req.setStatus(Requisition.RequisitionStatus.RETURNED);
                    }
                    requisitionRepository.save(req);

                    // Add Requisition History
                    RequisitionHistory history = RequisitionHistory.builder()
                            .requisition(req)
                            .oldStatus(oldStatus)
                            .newStatus(req.getStatus().name())
                            .actionComment("[Approvals Inbox - " + decision + "] " + (remarks != null ? remarks : ""))
                            .changedBy(approverUser)
                            .build();
                    requisitionHistoryRepository.save(history);
                });
            }
        } catch (Exception e) {
            log.warn("Failed to synchronize underlying entity for approval ID {}: {}", approval.getId(),
                    e.getMessage());
        }
    }

    private void recordAudit(UserPrincipal user, String action, String entityType, String entityId, String details) {
        try {
            AuditLog logEntry = AuditLog.builder()
                    .actorId(user != null ? user.getId() : 1L)
                    .actorName(user != null ? user.getName() : "HR Admin")
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .newValue("{\"details\":\"" + details + "\"}")
                    .ipAddress("127.0.0.1")
                    .userAgent("Urja ATS Approvals Inbox")
                    .build();
            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.warn("Could not record audit log: {}", e.getMessage());
        }
    }

    private boolean hasRole(UserPrincipal user, String role) {
        if (user == null || user.getAuthorities() == null)
            return false;
        return user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equalsIgnoreCase(role));
    }

    private boolean canUserDecide(Approval approval, UserPrincipal user) {
        if (user == null)
            return false;
        if (hasSuperAdminRights(user))
            return true;

        if (approval.getStatus() != Approval.ApprovalStatus.PENDING
                && approval.getStatus() != Approval.ApprovalStatus.RETURNED) {
            return false;
        }

        // Assigned approver check
        if (approval.getAssignedApprover() != null && approval.getAssignedApprover().getId().equals(user.getId())) {
            return true;
        }

        // Assigned role check
        if (approval.getAssignedApproverRole() != null) {
            return hasRole(user, approval.getAssignedApproverRole());
        }

        // Role-based authority
        return hasRole(user, "ROLE_HR_ADMIN") ||
                hasRole(user, "ROLE_APPROVING_MANAGER") ||
                hasRole(user, "ROLE_SENIOR_MGMT") ||
                hasRole(user, "ROLE_DEPT_HEAD");
    }

    private boolean hasSuperAdminRights(UserPrincipal user) {
        return hasRole(user, "ROLE_IT_ADMIN") || hasRole(user, "ROLE_HR_ADMIN");
    }

    private boolean isDeptHead(UserPrincipal user) {
        return hasRole(user, "ROLE_DEPT_HEAD");
    }

    private boolean isManagerOrSenior(UserPrincipal user) {
        return hasRole(user, "ROLE_APPROVING_MANAGER") || hasRole(user, "ROLE_SENIOR_MGMT");
    }

    private boolean isItAdmin(UserPrincipal user) {
        return hasRole(user, "ROLE_IT_ADMIN");
    }

    private String getPrimaryRoleName(UserPrincipal user) {
        if (user == null || user.getAuthorities() == null || user.getAuthorities().isEmpty())
            return "User";
        if (hasRole(user, "ROLE_IT_ADMIN"))
            return "IT Admin";
        if (hasRole(user, "ROLE_HR_ADMIN"))
            return "HR Admin";
        if (hasRole(user, "ROLE_APPROVING_MANAGER"))
            return "Hiring Manager";
        if (hasRole(user, "ROLE_SENIOR_MGMT"))
            return "Senior VP";
        if (hasRole(user, "ROLE_DEPT_HEAD"))
            return "Department Head";
        if (hasRole(user, "ROLE_HR_RECRUITER"))
            return "Recruiter";
        return user.getAuthorities().iterator().next().getAuthority();
    }

    private ApprovalResponseDto toDto(Approval a, UserPrincipal currentUser) {
        boolean canDecide = canUserDecide(a, currentUser);
        boolean isSelf = a.getRequestedBy() != null && currentUser != null
                && a.getRequestedBy().getId().equals(currentUser.getId());

        String restrictionReason = null;
        if (isSelf && !isItAdmin(currentUser)) {
            restrictionReason = "You cannot approve your own request according to corporate policy.";
            canDecide = false;
        }

        boolean isPending = a.getStatus() == Approval.ApprovalStatus.PENDING
                || a.getStatus() == Approval.ApprovalStatus.RETURNED;

        List<ApprovalCommentDto> comments = commentRepository.findByApprovalIdOrderByCreatedAtAsc(a.getId())
                .stream()
                .map(c -> ApprovalCommentDto.builder()
                        .id(c.getId())
                        .userId(c.getUser() != null ? c.getUser().getId() : null)
                        .userName(c.getUserName())
                        .userRole(c.getUserRole())
                        .comment(c.getComment())
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ApprovalResponseDto.builder()
                .id(a.getId())
                .approvalCode(a.getApprovalCode())
                .approvalType(a.getApprovalType().name())
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .title(a.getTitle())
                .subtitle(a.getSubtitle())
                .department(a.getDepartment())
                .location(a.getLocation())
                .priority(a.getPriority().name())
                .status(a.getStatus().name())
                .requestedById(a.getRequestedBy() != null ? a.getRequestedBy().getId() : null)
                .requesterName(a.getRequesterName())
                .requesterRole(a.getRequesterRole())
                .requesterAvatar(a.getRequesterAvatar())
                .requestDate(a.getRequestDate())
                .assignedApproverId(a.getAssignedApprover() != null ? a.getAssignedApprover().getId() : null)
                .assignedApproverRole(a.getAssignedApproverRole())
                .decisionById(a.getDecisionBy() != null ? a.getDecisionBy().getId() : null)
                .decisionByName(a.getDecisionByName())
                .decisionDate(a.getDecisionDate())
                .decisionRemarks(a.getDecisionRemarks())
                .candidateName(a.getCandidateName())
                .candidateEmail(a.getCandidateEmail())
                .candidatePhone(a.getCandidatePhone())
                .candidateAvatar(a.getCandidateAvatar())
                .jobTitle(a.getJobTitle())
                .openings(a.getOpenings())
                .justification(a.getJustification())
                .targetJoiningDate(a.getTargetJoiningDate())
                .offerDate(a.getOfferDate())
                .proposedJoiningDate(a.getProposedJoiningDate())
                .ctcFixed(a.getCtcFixed())
                .ctcVariable(a.getCtcVariable())
                .ctcTotal(a.getCtcTotal())
                .offerLetterUrl(a.getOfferLetterUrl())
                .detailsJson(a.getDetailsJson())
                .canApprove(canDecide && isPending)
                .canReject(canDecide && isPending)
                .canReturn(canDecide && isPending)
                .canAddComment(true)
                .permissionRestrictionReason(restrictionReason)
                .comments(comments)
                .build();
    }
}
