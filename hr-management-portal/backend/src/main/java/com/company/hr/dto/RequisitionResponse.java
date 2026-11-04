package com.company.hr.dto;

import com.company.hr.entity.Requisition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequisitionResponse {
    private Long id;
    private String requisitionCode;
    private String jobTitle;
    private Long departmentId;
    private String departmentName;
    private Long designationId;
    private String designationName;
    private Integer headcount;
    private Requisition.PositionType positionType;
    private String replacementForEmployeeName;
    private Requisition.RequisitionPriority priority;
    private Integer experienceYearsMin;
    private Integer experienceYearsMax;
    private BigDecimal minBudget;
    private BigDecimal maxBudget;
    private String jobDescription;
    private String justification;
    private Requisition.RequisitionStatus status;
    private String createdByName;
    private Long assignedRecruiterId;
    private String assignedRecruiterName;
    private LocalDate tatStartDate;
    private Integer tatTargetDays;
    private LocalDate dueDate;
    private Integer elapsedDays;
    private Integer daysRemaining;
    private Boolean isOverdue;
    private Integer actualTatDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
