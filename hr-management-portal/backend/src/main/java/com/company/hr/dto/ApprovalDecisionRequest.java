package com.company.hr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalDecisionRequest {
    @NotNull(message = "Decision is required (APPROVED, REJECTED, RETURNED)")
    private String decision; // APPROVED, REJECTED, RETURNED

    private String remarks; // Required for REJECTED and RETURNED
}
