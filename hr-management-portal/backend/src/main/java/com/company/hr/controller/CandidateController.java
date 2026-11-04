package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.CandidateRequest;
import com.company.hr.entity.Candidate;
import com.company.hr.service.CandidateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import com.company.hr.dto.CandidateStatsDto;
import com.company.hr.entity.CandidateDocument;
import com.company.hr.security.UserPrincipal;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/candidates")
@RequiredArgsConstructor
@Tag(name = "Candidates", description = "Candidate repository, resume details, and pipeline stages")
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get candidate pipeline metrics and summary counts")
    public ResponseEntity<ApiResponse<CandidateStatsDto>> getCandidateStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        CandidateStatsDto stats = candidateService.getCandidateStats(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Register a new candidate profile against a requisition")
    public ResponseEntity<ApiResponse<Candidate>> createCandidate(@Valid @RequestBody CandidateRequest request) {
        Candidate candidate = candidateService.createCandidate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(candidate, "Candidate profile created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Update an existing candidate profile")
    public ResponseEntity<ApiResponse<Candidate>> updateCandidate(
            @PathVariable Long id,
            @Valid @RequestBody CandidateRequest request) {
        Candidate candidate = candidateService.updateCandidate(id, request);
        return ResponseEntity.ok(ApiResponse.ok(candidate, "Candidate profile updated"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get filtered and paginated candidate profiles")
    public ResponseEntity<ApiResponse<Page<Candidate>>> getAllCandidates(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long requisitionId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 10, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        Page<Candidate> page = candidateService.filterCandidates(search, requisitionId, department, status, source, currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/by-requisition/{requisitionId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all candidates assigned to a requisition")
    public ResponseEntity<ApiResponse<List<Candidate>>> getCandidatesByRequisition(@PathVariable Long requisitionId) {
        List<Candidate> candidates = candidateService.getCandidatesByRequisition(requisitionId);
        return ResponseEntity.ok(ApiResponse.ok(candidates));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single candidate details")
    public ResponseEntity<ApiResponse<Candidate>> getCandidateById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Candidate candidate = candidateService.getCandidateById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(candidate));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Update candidate pipeline status (Screening, Interview, Offer, Joined, Rejected)")
    public ResponseEntity<ApiResponse<Candidate>> updateStatus(
            @PathVariable Long id,
            @RequestParam Candidate.CandidateStatus status) {
        Candidate candidate = candidateService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok(candidate, "Candidate status updated to " + status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN')")
    @Operation(summary = "Delete candidate profile")
    public ResponseEntity<ApiResponse<String>> deleteCandidate(@PathVariable Long id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.ok(ApiResponse.ok("Candidate successfully deleted"));
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HR_RECRUITER')")
    @Operation(summary = "Upload candidate resume file")
    public ResponseEntity<ApiResponse<CandidateDocument>> uploadResume(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal currentUser) throws IOException {
        CandidateDocument doc = candidateService.uploadResume(id, file, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(doc, "Resume uploaded successfully"));
    }
}
