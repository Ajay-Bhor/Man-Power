package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.ApprovalActionRequest;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.ApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/requisitions/{id}/approvals")
@RequiredArgsConstructor
@Tag(name = "Approval Workflow", description = "Actions for HR review, manager approval, and senior executive signoff")
public class ApprovalController {

    private final ApprovalService approvalService;

    @PostMapping
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN', 'APPROVING_MANAGER', 'SENIOR_MGMT', 'DEPT_HEAD')")
    @Operation(summary = "Approve, Reject, or Return a requisition with remarks")
    public ResponseEntity<ApiResponse<RequisitionResponse>> processApproval(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalActionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        RequisitionResponse response = approvalService.processApproval(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Approval action '" + request.getDecision() + "' processed successfully"));
    }
}
