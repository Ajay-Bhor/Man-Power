package com.company.hr.controller;

import com.company.hr.dto.*;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.OfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/offers")
@RequiredArgsConstructor
@Tag(name = "Offers & Onboarding", description = "Offer letters, acceptance tracking, workflow transitions and onboarding checklists")
public class OfferController {

    private final OfferService offerService;

    @GetMapping("/summary-stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get database-backed summary counts for the 7 top cards")
    public ResponseEntity<ApiResponse<OfferSummaryStatsDto>> getSummaryStats() {
        return ResponseEntity.ok(ApiResponse.ok(offerService.getSummaryStats()));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get filtered and paginated offers list")
    public ResponseEntity<ApiResponse<Page<OfferResponseDto>>> getOffers(
            @RequestParam(required = false, defaultValue = "ALL") String tab,
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String joiningMonth,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 5, sort = "offerDate", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<OfferResponseDto> page = offerService.filterOffers(
                tab, requisitionId, department, status, joiningMonth, search, currentUser, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single offer details with role-based compensation protection")
    public ResponseEntity<ApiResponse<OfferResponseDto>> getOfferById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(offerService.getOfferById(id, currentUser)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Create a new offer letter with candidate eligibility check and duplicate protection")
    public ResponseEntity<ApiResponse<OfferResponseDto>> createOffer(
            @Valid @RequestBody OfferRequestDto request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        OfferResponseDto response = offerService.createOffer(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response, "Offer letter generated successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Update an existing offer and manual compensation values")
    public ResponseEntity<ApiResponse<OfferResponseDto>> updateOffer(
            @PathVariable Long id,
            @Valid @RequestBody OfferRequestDto request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        OfferResponseDto response = offerService.updateOffer(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Offer updated successfully"));
    }

    @PatchMapping("/{id}/workflow")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER', 'DEPT_HEAD')")
    @Operation(summary = "Transition offer workflow status (Send, Accept, Decline, Schedule Joining, Onboard, Revoke)")
    public ResponseEntity<ApiResponse<OfferResponseDto>> transitionWorkflow(
            @PathVariable Long id,
            @Valid @RequestBody OfferWorkflowRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        OfferResponseDto response = offerService.transitionWorkflow(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response, "Offer status updated to " + request.getStatus()));
    }

    @GetMapping("/{id}/onboarding")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get onboarding checklist items for an offer")
    public ResponseEntity<ApiResponse<List<OnboardingItemDto>>> getOnboardingChecklist(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(offerService.getOnboardingChecklist(id)));
    }

    @PutMapping("/{id}/onboarding/{itemId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Update an onboarding checklist item verification status")
    public ResponseEntity<ApiResponse<OnboardingItemDto>> updateChecklistItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestParam(required = false) Boolean isCompleted,
            @RequestParam(required = false) String notes,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        OnboardingItemDto updated = offerService.updateChecklistItem(id, itemId, isCompleted, notes, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Onboarding item updated"));
    }

    @GetMapping("/{id}/letter")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Generate and preview formal Urja Foods offer letter document")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOfferLetter(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(offerService.generateOfferLetter(id, currentUser)));
    }
}
