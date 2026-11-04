package com.company.hr.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Approval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "approval_code", nullable = false, unique = true, length = 50)
    private String approvalCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_type", nullable = false, length = 50)
    private ApprovalType approvalType;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 255)
    private String subtitle;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 100)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id")
    private User requestedBy;

    @Column(name = "requester_name", nullable = false, length = 150)
    private String requesterName;

    @Column(name = "requester_role", nullable = false, length = 100)
    private String requesterRole;

    @Column(name = "requester_avatar", length = 500)
    private String requesterAvatar;

    @Column(name = "request_date", nullable = false)
    private LocalDateTime requestDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_approver_id")
    private User assignedApprover;

    @Column(name = "assigned_approver_role", length = 50)
    private String assignedApproverRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_by_id")
    private User decisionBy;

    @Column(name = "decision_by_name", length = 150)
    private String decisionByName;

    @Column(name = "decision_date")
    private LocalDateTime decisionDate;

    @Column(name = "decision_remarks", columnDefinition = "TEXT")
    private String decisionRemarks;

    @Column(name = "candidate_name", length = 150)
    private String candidateName;

    @Column(name = "candidate_email", length = 150)
    private String candidateEmail;

    @Column(name = "candidate_phone", length = 50)
    private String candidatePhone;

    @Column(name = "candidate_avatar", length = 500)
    private String candidateAvatar;

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    private Integer openings;

    @Column(columnDefinition = "TEXT")
    private String justification;

    @Column(name = "target_joining_date")
    private LocalDate targetJoiningDate;

    @Column(name = "offer_date")
    private LocalDate offerDate;

    @Column(name = "proposed_joining_date")
    private LocalDate proposedJoiningDate;

    @Column(name = "ctc_fixed", precision = 12, scale = 2)
    private BigDecimal ctcFixed;

    @Column(name = "ctc_variable", precision = 12, scale = 2)
    private BigDecimal ctcVariable;

    @Column(name = "ctc_total", precision = 12, scale = 2)
    private BigDecimal ctcTotal;

    @Column(name = "offer_letter_url", length = 500)
    private String offerLetterUrl;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ApprovalType {
        OFFER_APPROVAL,
        REQUISITION_APPROVAL,
        HIRING_APPROVAL,
        OTHER_APPROVAL
    }

    public enum ApprovalStatus {
        PENDING,
        APPROVED,
        REJECTED,
        RETURNED
    }

    public enum Priority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }
}
