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
@Table(name = "requisitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Requisition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requisition_code", nullable = false, unique = true, length = 50)
    private String requisitionCode;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "designation_id", nullable = false)
    private Designation designation;

    @Column(nullable = false)
    @Builder.Default
    private Integer headcount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "position_type", nullable = false, length = 30)
    @Builder.Default
    private PositionType positionType = PositionType.NEW_HEADCOUNT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replacement_for_employee_id")
    private Employee replacementForEmployee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RequisitionPriority priority = RequisitionPriority.MEDIUM;

    @Column(name = "experience_years_min", nullable = false)
    @Builder.Default
    private Integer experienceYearsMin = 1;

    @Column(name = "experience_years_max", nullable = false)
    @Builder.Default
    private Integer experienceYearsMax = 5;

    @Column(name = "min_budget", precision = 12, scale = 2)
    private BigDecimal minBudget;

    @Column(name = "max_budget", precision = 12, scale = 2)
    private BigDecimal maxBudget;

    @Column(name = "job_description", nullable = false, columnDefinition = "TEXT")
    private String jobDescription;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String justification;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 35)
    @Builder.Default
    private RequisitionStatus status = RequisitionStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_recruiter_id")
    private User assignedRecruiter;

    @Column(name = "tat_start_date")
    private LocalDate tatStartDate;

    @Column(name = "tat_target_days", nullable = false)
    @Builder.Default
    private Integer tatTargetDays = 30;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "actual_tat_days")
    private Integer actualTatDays;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PositionType {
        NEW_HEADCOUNT,
        REPLACEMENT,
        BUDGETED_EXPANSION
    }

    public enum RequisitionPriority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }

    public enum RequisitionStatus {
        DRAFT,
        PENDING_HR_REVIEW,
        PENDING_DEPT_APPROVAL,
        PENDING_SENIOR_APPROVAL,
        APPROVED,
        RECRUITER_ASSIGNED,
        SOURCING,
        INTERVIEWING,
        OFFER_IN_PROGRESS,
        FILLED,
        CLOSED,
        REJECTED,
        RETURNED
    }
}
