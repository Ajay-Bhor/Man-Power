package com.company.hr.controller;

import com.company.hr.dto.*;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.TaskService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Recruitment Tasks", description = "Operational task assignment, workload tracking, and deadlines")
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get paginated recruitment tasks with role-based filtering")
    public ResponseEntity<ApiResponse<Page<TaskResponseDto>>> getTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taskType,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long assignedUserId,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 15, sort = "dueDate") Pageable pageable) {

        Page<TaskResponseDto> page = taskService.getTasks(
                status, taskType, priority, assignedUserId, search, currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/summary-stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get database-backed summary counts for Task KPI cards")
    public ResponseEntity<ApiResponse<TaskSummaryStatsDto>> getSummaryStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getSummaryStats(currentUser)));
    }

    @GetMapping("/eligible-assignees")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HRBP')")
    @Operation(summary = "Get active users eligible for a specific recruitment task type")
    public ResponseEntity<ApiResponse<List<EligibleAssigneeDto>>> getEligibleAssignees(
            @RequestParam(required = false) String taskType) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getEligibleAssignees(taskType)));
    }

    @GetMapping("/my-tasks")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get tasks assigned to the currently authenticated user")
    public ResponseEntity<ApiResponse<List<TaskResponseDto>>> getMyTasks(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Page<TaskResponseDto> page = taskService.getTasks(
                null, null, null, currentUser.getId(), null, currentUser, Pageable.unpaged());
        return ResponseEntity.ok(ApiResponse.ok(page.getContent()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get details of a specific recruitment task")
    public ResponseEntity<ApiResponse<TaskResponseDto>> getTaskById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getTaskById(id, currentUser)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HRBP')")
    @Operation(summary = "Assign a new recruitment task to an eligible active user")
    public ResponseEntity<ApiResponse<TaskResponseDto>> createTask(
            @Valid @RequestBody TaskCreateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponseDto created = taskService.createTask(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(created, "Recruitment task successfully assigned to " + created.getAssignedUserName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update task details or reassign to another active user")
    public ResponseEntity<ApiResponse<TaskResponseDto>> updateTask(
            @PathVariable Long id,
            @RequestBody TaskUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponseDto updated = taskService.updateTask(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Task updated successfully"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Quickly update task status (e.g. mark completed)")
    public ResponseEntity<ApiResponse<TaskResponseDto>> updateTaskStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String status = body.get("status");
        String comments = body.get("comments");
        TaskUpdateRequest req = TaskUpdateRequest.builder()
                .status(status)
                .comments(comments)
                .build();
        TaskResponseDto updated = taskService.updateTask(id, req, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Task status updated to " + updated.getStatus()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HRBP')")
    @Operation(summary = "Delete or cancel a recruitment task")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        taskService.deleteTask(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "Recruitment task deleted"));
    }
}
