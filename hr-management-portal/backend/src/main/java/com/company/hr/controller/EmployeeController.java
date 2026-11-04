package com.company.hr.controller;

import com.company.hr.dto.*;
import com.company.hr.entity.Employee;
import com.company.hr.entity.EmployeeDocument;
import com.company.hr.repository.EmployeeDocumentRepository;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Management", description = "Employee profiles, departments, managers, lifecycle transitions, and confidential documents")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDocumentRepository employeeDocumentRepository;

    @GetMapping("/summary-stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get database-backed summary counts for Employee Management cards")
    public ResponseEntity<ApiResponse<EmployeeSummaryStatsDto>> getSummaryStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getSummaryStats(currentUser)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get paginated employees with multi-attribute filtering and search")
    public ResponseEntity<ApiResponse<Page<EmployeeResponseDto>>> getEmployees(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String employmentType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 10, sort = "employeeCode") Pageable pageable) {
        Page<EmployeeResponseDto> page = employeeService.filterEmployees(
                department, employmentType, status, location, search, currentUser, pageable);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single employee details with lifecycle data")
    public ResponseEntity<ApiResponse<EmployeeResponseDto>> getEmployeeById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getEmployeeById(id, currentUser)));
    }

    @PostMapping("/{id}/transition-status")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'HRBP')")
    @Operation(summary = "Transition employee lifecycle status with audit logging")
    public ResponseEntity<ApiResponse<EmployeeResponseDto>> transitionStatus(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeStatusTransitionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        EmployeeResponseDto updated = employeeService.transitionStatus(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Employee status successfully updated"));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get employment status audit history")
    public ResponseEntity<ApiResponse<List<EmployeeStatusHistoryDto>>> getStatusHistory(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(employeeService.getStatusHistory(id)));
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN') or @userSecurity.isCurrentEmployee(#id, authentication)")
    @Operation(summary = "Get secured employee documents (restricted access)")
    public ResponseEntity<ApiResponse<List<EmployeeDocument>>> getEmployeeDocuments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(employeeDocumentRepository.findByEmployeeId(id)));
    }
}

