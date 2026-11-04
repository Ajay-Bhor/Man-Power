package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDto {
    private Long id;
    private Long candidateId;
    private Long offerId;
    private String employeeCode;
    private String name;
    private String avatarUrl;
    private String email;
    private String phoneNumber;

    // Personal Information
    private String gender;
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String maritalStatus;
    private String address;

    // Employment Information
    private Long departmentId;
    private String departmentName;
    private Long designationId;
    private String designationName;
    private String workLocation;
    private LocalDate joiningDate;
    private String employmentType; // Full Time, Contract, Intern
    private Long reportingManagerId;
    private String reportingManagerName;

    // Probation & Confirmation
    private Integer probationDurationMonths;
    private LocalDate probationEndDate;
    private String confirmationStatus; // CONFIRMED, PENDING_REVIEW, EXTENDED
    private LocalDate confirmationDate;
    private boolean isConfirmationDue;

    // Resignation & Exit Lifecycle
    private LocalDate resignationDate;
    private Integer noticePeriodDays;
    private LocalDate lastWorkingDay;
    private LocalDate actualExitDate;
    private String exitReason;
    private String exitChecklistStatus;

    // Primary Status
    private String status; // ON_PROBATION, ACTIVE, RESIGNATION_SUBMITTED, NOTICE_PERIOD, EXITED, TERMINATED

    // Compensation (Protected - Only authorized roles)
    private BigDecimal ctcTotal;

    // Permissions
    private boolean canViewSensitiveInfo;
    private boolean canTransitionStatus;
    private boolean canEdit;

    // Status History Audit Trail
    private List<EmployeeStatusHistoryDto> statusHistory;
}
