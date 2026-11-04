package com.company.hr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "requisition_approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequisitionApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id", nullable = false)
    private Requisition requisition;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_stage", nullable = false, length = 30)
    private ApprovalStage approvalStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ApprovalDecision decision = ApprovalDecision.PENDING;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "decision_date")
    private LocalDateTime decisionDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ApprovalStage {
        HR_REVIEW,
        MANAGER_APPROVAL,
        SENIOR_APPROVAL
    }

    public enum ApprovalDecision {
        APPROVED,
        REJECTED,
        RETURNED_FOR_CORRECTION,
        PENDING
    }
}
