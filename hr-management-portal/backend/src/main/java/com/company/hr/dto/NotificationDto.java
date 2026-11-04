package com.company.hr.dto;

import com.company.hr.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {

    private Long id;
    private String eventType;
    private String title;
    private String message;
    private String targetUrl;
    private Boolean isRead;
    private String readStatus;
    private String time;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;

    public static NotificationDto fromEntity(Notification entity) {
        if (entity == null) return null;

        String relativeTime = formatRelativeTime(entity.getCreatedAt() != null ? entity.getCreatedAt() : entity.getSentAt());

        return NotificationDto.builder()
                .id(entity.getId())
                .eventType(entity.getEventType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .targetUrl(entity.getTargetUrl())
                .isRead(entity.getIsRead() != null ? entity.getIsRead() : false)
                .readStatus(entity.getReadStatus() != null ? entity.getReadStatus().name() : "UNREAD")
                .time(relativeTime)
                .sentAt(entity.getSentAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private static String formatRelativeTime(LocalDateTime dateTime) {
        if (dateTime == null) return "Just now";
        Duration duration = Duration.between(dateTime, LocalDateTime.now());
        long seconds = duration.getSeconds();
        if (seconds < 60) return "Just now";
        long minutes = duration.toMinutes();
        if (minutes < 60) return minutes + " min ago";
        long hours = duration.toHours();
        if (hours < 24) return hours + (hours == 1 ? " hour ago" : " hours ago");
        long days = duration.toDays();
        if (days < 30) return days + (days == 1 ? " day ago" : " days ago");
        return dateTime.toLocalDate().toString();
    }
}

