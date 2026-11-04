package com.company.hr.dto;

import com.company.hr.entity.RequisitionApproval;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalActionRequest {

    @NotNull(message = "Decision is required")
    private RequisitionApproval.ApprovalDecision decision;

    private String remarks;
}
