package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalResponseDto {
    private Long id;
    private String approvalCode;
    private String approvalType; // OFFER_APPROVAL, REQUISITION_APPROVAL, HIRING_APPROVAL, OTHER_APPROVAL
    private String entityType;
    private Long entityId;
    private String title;
    private String subtitle;
    private String department;
    private String location;
    private String priority;
    private String status;

    // Requester
    private Long requestedById;
    private String requesterName;
    private String requesterRole;
    private String requesterAvatar;
    private LocalDateTime requestDate;

    // Assignment & Decision
    private Long assignedApproverId;
    private String assignedApproverRole;
    private Long decisionById;
    private String decisionByName;
    private LocalDateTime decisionDate;
    private String decisionRemarks;

    // Entity Specific Fields
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateAvatar;
    private String jobTitle;
    private Integer openings;
    private String justification;
    private LocalDate targetJoiningDate;
    private LocalDate offerDate;
    private LocalDate proposedJoiningDate;
    private BigDecimal ctcFixed;
    private BigDecimal ctcVariable;
    private BigDecimal ctcTotal;
    private String offerLetterUrl;
    private String detailsJson;

    // Workflow & Security Permissions for the logged-in user
    private boolean canApprove;
    private boolean canReject;
    private boolean canReturn;
    private boolean canAddComment;
    private String permissionRestrictionReason;

    // Comments & Audit history
    private List<ApprovalCommentDto> comments;
}
