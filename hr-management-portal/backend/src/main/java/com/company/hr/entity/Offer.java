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
@Table(name = "offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "offer_code", nullable = false, unique = true, length = 50)
    private String offerCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "candidate_name", nullable = false, length = 150)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 150)
    private String candidateEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id")
    private Requisition requisition;

    @Column(name = "requisition_code", length = 50)
    private String requisitionCode;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(name = "offer_date", nullable = false)
    private LocalDate offerDate;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Column(name = "ctc_fixed", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal ctcFixed = BigDecimal.ZERO;

    @Column(name = "ctc_variable", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal ctcVariable = BigDecimal.ZERO;

    @Column(name = "ctc_total", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal ctcTotal = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private OfferStatus status = OfferStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "onboarding_status", nullable = false, length = 30)
    @Builder.Default
    private OnboardingStatus onboardingStatus = OnboardingStatus.NOT_STARTED;

    @Column(name = "approval_stage", length = 50)
    @Builder.Default
    private String approvalStage = "Approved";

    @Column(name = "offer_letter_url", length = 500)
    private String offerLetterUrl;

    @Column(name = "decline_reason", length = 500)
    private String declineReason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum OfferStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        OFFER_SENT,
        ACCEPTED,
        DECLINED,
        JOINING_SCHEDULED,
        ONBOARDING,
        ONBOARDED,
        WITHDRAWN,
        EXPIRED
    }

    public enum OnboardingStatus {
        NOT_STARTED,
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        NOT_APPLICABLE
    }
}
