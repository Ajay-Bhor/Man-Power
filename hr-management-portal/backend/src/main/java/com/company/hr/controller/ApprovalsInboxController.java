package com.company.hr.controller;

import com.company.hr.dto.*;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.ApprovalsInboxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
@Tag(name = "Approvals Inbox", description = "Enterprise multi-tier signoffs for offers, job requisitions, hiring decisions, and background checks")
public class ApprovalsInboxController {

    private final ApprovalsInboxService approvalsService;

    @GetMapping("/summary-stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get database-backed summary counts for top cards and functional tabs")
    public ResponseEntity<ApiResponse<ApprovalSummaryStatsDto>> getSummaryStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ApprovalSummaryStatsDto stats = approvalsService.getSummaryStats(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get filtered and paginated approvals list with search and role-based security")
    public ResponseEntity<ApiResponse<Page<ApprovalResponseDto>>> getApprovals(
            @RequestParam(required = false, defaultValue = "ALL") String tab,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String requestedBy,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 10, sort = "requestDate", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<ApprovalResponseDto> page = approvalsService.filterApprovals(
                tab, type, status, department, requestedBy, search, currentUser, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get approval details by ID with compensation and workflow history")
    public ResponseEntity<ApiResponse<ApprovalResponseDto>> getApprovalById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ApprovalResponseDto dto = approvalsService.getApprovalById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Process approval decision (Approve, Reject, Return for Correction)")
    public ResponseEntity<ApiResponse<ApprovalResponseDto>> processDecision(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ApprovalResponseDto response = approvalsService.processDecision(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Approval decision '" + request.getDecision() + "' processed successfully"));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a comment to an approval discussion thread")
    public ResponseEntity<ApiResponse<ApprovalCommentDto>> addComment(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalCommentRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ApprovalCommentDto comment = approvalsService.addComment(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(comment, "Comment posted successfully"));
    }
}
