package com.company.hr.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferRequestDto {

    @NotNull(message = "Candidate ID is required")
    private Long candidateId;

    private Long requisitionId;

    @NotNull(message = "Job title is required")
    private String jobTitle;

    @NotNull(message = "Department is required")
    private String department;

    @NotNull(message = "Location is required")
    private String location;

    @NotNull(message = "Offer date is required")
    private LocalDate offerDate;

    @NotNull(message = "Proposed joining date is required")
    private LocalDate joiningDate;

    @DecimalMin(value = "0.0", inclusive = true, message = "Fixed CTC must not be negative")
    private BigDecimal ctcFixed;

    @DecimalMin(value = "0.0", inclusive = true, message = "Variable CTC must not be negative")
    private BigDecimal ctcVariable;

    @DecimalMin(value = "0.0", inclusive = true, message = "Total Gross CTC must not be negative")
    private BigDecimal ctcTotal;

    @Builder.Default
    private String approvalWorkflow = "DIRECT"; // DIRECT or ROUTED_TO_DGM

    @Builder.Default
    private String action = "SEND_OFFER"; // SEND_OFFER or SAVE_DRAFT

    private String notes;
}
