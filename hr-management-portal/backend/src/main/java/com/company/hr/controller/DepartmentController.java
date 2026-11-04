package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.entity.Department;
import com.company.hr.entity.Designation;
import com.company.hr.repository.DepartmentRepository;
import com.company.hr.repository.DesignationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Departments & Designations", description = "Department and Designation Master data management")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get list of active departments")
    public ResponseEntity<ApiResponse<List<Department>>> getDepartments() {
        return ResponseEntity.ok(ApiResponse.ok(departmentRepository.findAll()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Create a new department")
    public ResponseEntity<ApiResponse<Department>> createDepartment(@RequestBody Department department) {
        return ResponseEntity.ok(ApiResponse.ok(departmentRepository.save(department), "Department created"));
    }

    @GetMapping("/{id}/designations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get designations for a given department")
    public ResponseEntity<ApiResponse<List<Designation>>> getDesignationsByDepartment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(designationRepository.findByDepartmentIdAndActiveTrue(id)));
    }
}
