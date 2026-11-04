package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TatSummaryResponse {
    private Long requisitionId;
    private String requisitionCode;
    private String jobTitle;
    private String departmentName;
    private String recruiterName;
    private LocalDate tatStartDate;
    private LocalDate dueDate;
    private int targetDays;
    private int elapsedDays;
    private Integer daysRemaining;
    private boolean isOverdue;
    private double progressPercentage;
    private String statusCategory; // ON_TRACK, AT_RISK, OVERDUE, COMPLETED
}
