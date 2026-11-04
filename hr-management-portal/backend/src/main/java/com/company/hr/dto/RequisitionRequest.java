package com.company.hr.dto;

import com.company.hr.entity.Requisition;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequisitionRequest {

    @NotBlank(message = "Job title is required")
    private String jobTitle;

    @NotNull(message = "Department ID is required")
    private Long departmentId;

    @NotNull(message = "Designation ID is required")
    private Long designationId;

    @NotNull(message = "Headcount is required")
    @Min(value = 1, message = "Headcount must be at least 1")
    private Integer headcount;

    @NotNull(message = "Position type is required")
    private Requisition.PositionType positionType;

    private Long replacementForEmployeeId;

    @NotNull(message = "Priority is required")
    private Requisition.RequisitionPriority priority;

    @Min(0)
    private Integer experienceYearsMin;

    @Min(1)
    private Integer experienceYearsMax;

    private BigDecimal minBudget;
    private BigDecimal maxBudget;

    @NotBlank(message = "Job description is required")
    private String jobDescription;

    @NotBlank(message = "Business justification is required")
    private String justification;
}
