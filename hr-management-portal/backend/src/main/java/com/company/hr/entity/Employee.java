package com.company.hr.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offer_id")
    private Offer offer;

    @Column(name = "employee_code", nullable = false, unique = true, length = 50)
    private String employeeCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(length = 20)
    @Builder.Default
    private String gender = "Not Set";

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "blood_group", length = 10)
    @Builder.Default
    private String bloodGroup = "Not Set";

    @Column(name = "marital_status", length = 30)
    @Builder.Default
    private String maritalStatus = "Not Set";

    @Column(length = 255)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "designation_id", nullable = false)
    private Designation designation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporting_manager_id")
    private Employee reportingManager;

    @Column(name = "reporting_manager_name", length = 150)
    private String reportingManagerName;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 30)
    @Builder.Default
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    @Column(name = "probation_duration_months")
    @Builder.Default
    private Integer probationDurationMonths = 6;

    @Column(name = "probation_end_date")
    private LocalDate probationEndDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_status", nullable = false, length = 30)
    @Builder.Default
    private ConfirmationStatus confirmationStatus = ConfirmationStatus.PENDING_REVIEW;

    @Column(name = "confirmation_date")
    private LocalDate confirmationDate;

    @Column(name = "resignation_date")
    private LocalDate resignationDate;

    @Column(name = "notice_period_days")
    @Builder.Default
    private Integer noticePeriodDays = 30;

    @Column(name = "last_working_day")
    private LocalDate lastWorkingDay;

    @Column(name = "actual_exit_date")
    private LocalDate actualExitDate;

    @Column(name = "exit_reason", columnDefinition = "TEXT")
    private String exitReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "exit_checklist_status", nullable = false, length = 30)
    @Builder.Default
    private ExitChecklistStatus exitChecklistStatus = ExitChecklistStatus.NOT_STARTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ON_PROBATION;

    @Column(name = "work_location", length = 100)
    @Builder.Default
    private String workLocation = "Headquarters";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum EmploymentType {
        FULL_TIME,
        PART_TIME,
        CONTRACT,
        INTERN
    }

    public enum EmployeeStatus {
        ON_PROBATION,
        ACTIVE,
        RESIGNATION_SUBMITTED,
        NOTICE_PERIOD,
        EXITED,
        TERMINATED
    }

    public enum ConfirmationStatus {
        CONFIRMED,
        PENDING_REVIEW,
        EXTENDED,
        NOT_APPLICABLE
    }

    public enum ExitChecklistStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        NOT_APPLICABLE
    }
}
