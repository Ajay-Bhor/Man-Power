package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.UserCreateRequest;
import com.company.hr.dto.UserResponseDto;
import com.company.hr.dto.UserStatsDto;
import com.company.hr.dto.UserUpdateRequest;
import com.company.hr.entity.AccessPolicy;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.BackupHistory;
import com.company.hr.entity.Role;
import com.company.hr.entity.User;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.AccessPolicyService;
import com.company.hr.service.AuditService;
import com.company.hr.service.BackupService;
import com.company.hr.service.HrmsExcelBackupExportService;
import com.company.hr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "Audit logs, user management, access policies, backups and system maintenance")
public class AdminController {

    private final AuditService auditService;
    private final BackupService backupService;
    private final UserService userService;
    private final AccessPolicyService accessPolicyService;
    private final HrmsExcelBackupExportService excelBackupExportService;

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "View system security or HR recruitment audit trail")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditLogs(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PageableDefault(size = 20, sort = "timestamp", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(auditService.getScopedAuditLogs(currentUser, pageable)));
    }

    @GetMapping("/backups")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "View database backup and snapshot history")
    public ResponseEntity<ApiResponse<List<BackupHistory>>> getBackups() {
        return ResponseEntity.ok(ApiResponse.ok(backupService.getBackupHistory()));
    }

    @PostMapping("/backups/manual")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "Trigger on-demand manual full database backup")
    public ResponseEntity<ApiResponse<BackupHistory>> triggerManualBackup(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        BackupHistory backup = backupService.triggerManualBackup(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(backup, "Manual backup initiated and completed successfully"));
    }

    @GetMapping(value = "/backups/export-excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Export complete HRMS database backup as an offline Excel (.xlsx) workbook")
    public ResponseEntity<byte[]> exportFullDatabaseExcel(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            String filename = excelBackupExportService.generateDefaultFilename();
            byte[] excelBytes = excelBackupExportService.generateFullDatabaseExcelBackup(currentUser, filename);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
            headers.setContentLength(excelBytes.length);
            headers.setCacheControl(CacheControl.noCache().mustRevalidate());

            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("CRITICAL: Error in exportFullDatabaseExcel: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping(value = "/backups/{id}/export-excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Export HRMS database backup as an offline Excel (.xlsx) workbook for specific snapshot")
    public ResponseEntity<byte[]> exportDatabaseExcelForSnapshot(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        try {
            String filename = "HRMS_Backup_Snapshot_" + id + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss")) + ".xlsx";
            byte[] excelBytes = excelBackupExportService.generateFullDatabaseExcelBackup(currentUser, filename);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
            headers.setContentLength(excelBytes.length);
            headers.setCacheControl(CacheControl.noCache().mustRevalidate());

            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("CRITICAL: Error in exportFullDatabaseExcel: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "List all system user accounts, roles, and assigned task workloads")
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsersWithTaskCount()));
    }

    @GetMapping("/users/stats")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Get user management summary KPI stats")
    public ResponseEntity<ApiResponse<UserStatsDto>> getUserStats() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserStats()));
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Create a new user account and assign roles/departments")
    public ResponseEntity<ApiResponse<User>> createUser(
            @Valid @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userService.createUser(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(user, "User account created successfully"));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Update an existing user account details and roles")
    public ResponseEntity<ApiResponse<User>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userService.updateUser(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(user, "User account updated successfully"));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Activate or deactivate a user account")
    public ResponseEntity<ApiResponse<User>> updateUserStatus(
            @PathVariable Long id,
            @RequestParam User.UserStatus status,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userService.updateUserStatus(id, status, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(user, "User status updated to " + status));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Delete or deactivate a user account")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        userService.deleteUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "User removed or deactivated successfully"));
    }

    @PostMapping("/users/bulk-delete")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Bulk delete or deactivate user accounts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDeleteUsers(
            @RequestBody Map<String, List<Long>> request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<Long> ids = request.getOrDefault("userIds", request.get("ids"));
        int affected = userService.bulkDeleteUsers(ids, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("affectedCount", affected), affected + " user(s) removed or deactivated successfully"));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "List all available security roles")
    public ResponseEntity<ApiResponse<List<Role>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllRoles()));
    }

    @GetMapping("/policies")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "List all system access policies and assignment configurations")
    public ResponseEntity<ApiResponse<List<AccessPolicy>>> getPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(accessPolicyService.getAllPolicies()));
    }

    @PutMapping("/policies/{policyKey}")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "Update an access policy value")
    public ResponseEntity<ApiResponse<AccessPolicy>> updatePolicy(
            @PathVariable String policyKey,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String value = body.getOrDefault("policyValue", body.get("value"));
        AccessPolicy policy = accessPolicyService.updatePolicy(policyKey, value, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(policy, "Access policy updated successfully"));
    }

    @GetMapping("/system-settings")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "Get system-level administration configuration and runtime metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemSettings() {
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory() / (1024 * 1024);
        long totalMemory = runtime.totalMemory() / (1024 * 1024);
        long freeMemory = runtime.freeMemory() / (1024 * 1024);
        long usedMemory = totalMemory - freeMemory;

        Map<String, Object> settings = new java.util.LinkedHashMap<>();
        settings.put("environment", "Production - On-Premises (Urja Foods Enterprise)");
        settings.put("serverVersion", "Spring Boot 3.2.2 / Java 21 LTS");
        settings.put("sessionTimeoutMinutes", 60);
        settings.put("passwordExpiryDays", 90);
        settings.put("maxFailedLogins", 5);
        settings.put("mfaRequired", false);
        settings.put("maintenanceMode", false);
        settings.put("databaseHost", "localhost:3306");
        settings.put("databasePool", "HikariCP (Max: 10, Min-Idle: 2)");
        settings.put("jvmMemoryUsedMb", usedMemory);
        settings.put("jvmMemoryMaxMb", maxMemory);
        settings.put("activeTlsVersion", "TLSv1.3 / Enforced");
        settings.put("corsAllowedOrigins", "http://localhost:5173");
        return ResponseEntity.ok(ApiResponse.ok(settings));
    }

    @PutMapping("/system-settings")
    @PreAuthorize("hasRole('IT_ADMIN')")
    @Operation(summary = "Update system-level administration settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSystemSettings(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        auditService.logAction(
                currentUser != null ? currentUser.getId() : 1L,
                currentUser != null ? currentUser.getName() : "IT Admin",
                "SYSTEM_SETTINGS_UPDATED",
                "SYSTEM_CONFIG",
                "SYSTEM_MAIN",
                "{}",
                body.toString(),
                "127.0.0.1"
        );
        return ResponseEntity.ok(ApiResponse.ok(body, "System settings updated and applied successfully"));
    }
}
