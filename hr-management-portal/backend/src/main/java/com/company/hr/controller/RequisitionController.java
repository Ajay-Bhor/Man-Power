package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.RecruiterAssignRequest;
import com.company.hr.dto.RequisitionRequest;
import com.company.hr.dto.RequisitionResponse;
import com.company.hr.dto.TatSummaryResponse;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.RequisitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/requisitions")
@RequiredArgsConstructor
@Tag(name = "Requisitions", description = "Manpower requisition creation, listing, details, and recruiter assignment")
public class RequisitionController {

    private final RequisitionService requisitionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN', 'DEPT_HEAD', 'APPROVING_MANAGER')")
    @Operation(summary = "Submit a new manpower requisition")
    public ResponseEntity<ApiResponse<RequisitionResponse>> createRequisition(
            @Valid @RequestBody RequisitionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        RequisitionResponse response = requisitionService.createRequisition(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response, "Requisition created successfully"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get paginated requisitions")
    public ResponseEntity<ApiResponse<Page<RequisitionResponse>>> getAllRequisitions(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        Page<RequisitionResponse> page = requisitionService.getAllRequisitions(pageable, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get requisition details with live TAT calculations")
    public ResponseEntity<ApiResponse<RequisitionResponse>> getRequisitionById(@PathVariable Long id) {
        RequisitionResponse response = requisitionService.getRequisitionById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}/recruiter")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Assign a recruiter to an approved requisition and initiate TAT clock")
    public ResponseEntity<ApiResponse<RequisitionResponse>> assignRecruiter(
            @PathVariable Long id,
            @Valid @RequestBody RecruiterAssignRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        RequisitionResponse response = requisitionService.assignRecruiter(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Recruiter assigned and 30-day TAT SLA initiated"));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN', 'SENIOR_MGMT')")
    @Operation(summary = "Get list of requisitions that have exceeded their TAT SLA deadline")
    public ResponseEntity<ApiResponse<List<TatSummaryResponse>>> getOverdueRequisitions() {
        List<TatSummaryResponse> overdue = requisitionService.getOverdueRequisitions();
        return ResponseEntity.ok(ApiResponse.ok(overdue));
    }
}
