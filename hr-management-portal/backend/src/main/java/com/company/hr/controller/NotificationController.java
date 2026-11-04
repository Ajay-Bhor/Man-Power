package com.company.hr.controller;

import com.company.hr.dto.ApiResponse;
import com.company.hr.dto.NotificationCountDto;
import com.company.hr.dto.NotificationDto;
import com.company.hr.security.UserPrincipal;
import com.company.hr.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "User notification alerts, read/unread status, and unread counters")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current authenticated user's notifications ordered by newest first")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getUserNotifications(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<NotificationDto> notifications = notificationService.getUserNotifications(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(notifications));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get total unread notifications count for the authenticated user")
    public ResponseEntity<ApiResponse<NotificationCountDto>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        NotificationCountDto countDto = notificationService.getUnreadCount(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(countDto));
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark an individual notification as READ")
    public ResponseEntity<ApiResponse<NotificationDto>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        NotificationDto updated = notificationService.markAsRead(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Notification marked as read"));
    }

    @RequestMapping(value = "/read-all", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all unread notifications of the logged-in user as READ")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        int updatedCount = notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of(
                        "updatedCount", updatedCount,
                        "unreadCount", 0
                ),
                "All notifications marked as read"
        ));
    }
}

