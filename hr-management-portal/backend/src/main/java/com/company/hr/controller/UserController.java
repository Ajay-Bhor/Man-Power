package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.entity.User;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Two-step user deactivation and permanent deletion endpoints")
public class UserController {

    private final UserService userService;

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Deactivate user (Stage 1 of Two-Step Deletion)")
    public ResponseEntity<ApiResponse<User>> deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        User user = userService.deactivateUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(user, "User deactivated successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('IT_ADMIN', 'HR_ADMIN')")
    @Operation(summary = "Permanently delete inactive user (Stage 2 of Two-Step Deletion)")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        userService.deleteUser(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "User permanently deleted successfully."));
    }
}

