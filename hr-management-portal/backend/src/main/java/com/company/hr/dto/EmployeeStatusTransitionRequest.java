package com.company.hr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeStatusTransitionRequest {
    @NotNull(message = "Target status is required")
    private String targetStatus; // ON_PROBATION, ACTIVE, RESIGNATION_SUBMITTED, NOTICE_PERIOD, EXITED, TERMINATED

    private String reason; // Mandatory for resignation, exit, or termination

    // Conditional lifecycle fields
    private LocalDate confirmationDate;
    private LocalDate resignationDate;
    private Integer noticePeriodDays;
    private LocalDate lastWorkingDay;
    private LocalDate actualExitDate;
    private String exitReason;
    private String exitChecklistStatus;
}
