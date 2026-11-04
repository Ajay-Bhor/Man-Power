package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.EligibleInterviewerResponse;
import com.company.hr.dto.InterviewFeedbackRequest;
import com.company.hr.dto.InterviewReassignRequest;
import com.company.hr.dto.InterviewRescheduleRequest;
import com.company.hr.dto.InterviewScheduleRequest;
import com.company.hr.dto.InterviewerAvailabilityResponse;
import com.company.hr.entity.Interview;
import com.company.hr.entity.InterviewFeedback;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.InterviewService;
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

@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
@Tag(name = "Interviews", description = "Interview scheduling, calendar, ratings and feedback")
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN', 'DEPT_HEAD', 'HR_RECRUITER')")
    @Operation(summary = "Schedule an interview round and assign interviewer")
    public ResponseEntity<ApiResponse<Interview>> scheduleInterview(
            @Valid @RequestBody InterviewScheduleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.scheduleInterview(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(interview, "Interview scheduled and assigned successfully"));
    }

    @PostMapping("/schedule")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN', 'DEPT_HEAD', 'HR_RECRUITER')")
    @Operation(summary = "Schedule an interview round and assign interviewer (alias)")
    public ResponseEntity<ApiResponse<Interview>> scheduleInterviewAlias(
            @Valid @RequestBody InterviewScheduleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.scheduleInterview(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(interview, "Interview scheduled and assigned successfully"));
    }

    @GetMapping("/interviewers")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of active eligible panel interviewers")
    public ResponseEntity<ApiResponse<java.util.List<EligibleInterviewerResponse>>> getEligibleInterviewers() {
        return ResponseEntity.ok(ApiResponse.ok(interviewService.getEligibleInterviewers()));
    }

    @GetMapping("/check-availability")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check interviewer eligibility and availability for date/time without conflict")
    public ResponseEntity<ApiResponse<InterviewerAvailabilityResponse>> checkInterviewerAvailability(
            @RequestParam Long interviewerId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime scheduledAt,
            @RequestParam(required = false, defaultValue = "45") Integer durationMinutes,
            @RequestParam(required = false) Long excludeInterviewId) {
        InterviewerAvailabilityResponse response = interviewService.checkAvailability(interviewerId, scheduledAt, durationMinutes, excludeInterviewId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get paginated role-scoped interviews")
    public ResponseEntity<ApiResponse<Page<Interview>>> getAllInterviews(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 10, sort = "scheduledAt") Pageable pageable) {
        Page<Interview> page = interviewService.getInterviews(currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single interview details by ID")
    public ResponseEntity<ApiResponse<Interview>> getInterviewById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.getInterviewById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(interview));
    }

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN', 'DEPT_HEAD', 'HR_RECRUITER')")
    @Operation(summary = "Reschedule an interview round to a new date and time")
    public ResponseEntity<ApiResponse<Interview>> rescheduleInterview(
            @PathVariable Long id,
            @Valid @RequestBody InterviewRescheduleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.rescheduleInterview(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(interview, "Interview rescheduled successfully"));
    }

    @PutMapping("/{id}/reassign")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN', 'DEPT_HEAD', 'HR_RECRUITER')")
    @Operation(summary = "Reassign an interview to another eligible interviewer")
    public ResponseEntity<ApiResponse<Interview>> reassignInterview(
            @PathVariable Long id,
            @Valid @RequestBody InterviewReassignRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.reassignInterview(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(interview, "Interview reassigned successfully"));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN')")
    @Operation(summary = "Cancel an interview round")
    public ResponseEntity<ApiResponse<Interview>> cancelInterview(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.cancelInterview(id, reason, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(interview, "Interview cancelled"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'IT_ADMIN')")
    @Operation(summary = "Cancel an interview round (DELETE alias)")
    public ResponseEntity<ApiResponse<Interview>> cancelInterviewDelete(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Interview interview = interviewService.cancelInterview(id, reason, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(interview, "Interview cancelled"));
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit interview feedback, star ratings, and hire/reject recommendation")
    public ResponseEntity<ApiResponse<InterviewFeedback>> submitFeedback(
            @PathVariable Long id,
            @Valid @RequestBody InterviewFeedbackRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        InterviewFeedback feedback = interviewService.submitFeedback(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(feedback, "Interview feedback and scorecard recorded successfully"));
    }

    @GetMapping("/{id}/feedback")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get submitted feedback scorecard for an interview")
    public ResponseEntity<ApiResponse<InterviewFeedback>> getFeedback(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        InterviewFeedback feedback = interviewService.getFeedback(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(feedback));
    }
}
