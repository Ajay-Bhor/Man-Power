package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.DashboardSummaryResponse;
import com.company.hr.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "High-level metrics, hiring progress, and TAT alerts")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get aggregated executive and operational recruitment KPIs")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getDashboardSummary() {
        DashboardSummaryResponse summary = dashboardService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/personalized")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get personalized role-based dashboard data for the authenticated user")
    public ResponseEntity<ApiResponse<com.company.hr.dto.PersonalizedDashboardResponse>> getPersonalizedDashboard(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.company.hr.security.UserPrincipal currentUser) {
        com.company.hr.dto.PersonalizedDashboardResponse personalized = dashboardService.getPersonalizedDashboard(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(personalized));
    }
}
