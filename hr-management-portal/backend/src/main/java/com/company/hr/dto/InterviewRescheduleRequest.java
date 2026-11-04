package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewRescheduleRequest {

    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private String mode;
    private String meetingLink;
    private String meetingLocation;
    private String reason;

    public LocalDateTime getScheduledAt() {
        if (this.scheduledAt != null) return this.scheduledAt;
        return LocalDateTime.now().plusDays(2).withHour(15).withMinute(0);
    }

    public void setNewScheduledTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return;
        try {
            this.scheduledAt = LocalDateTime.parse(timeStr.length() == 16 ? timeStr + ":00" : timeStr);
        } catch (Exception ignored) {}
    }

    public void setLocationOrLink(String link) {
        if (link == null) return;
        if (link.startsWith("http")) {
            this.meetingLink = link;
        } else {
            this.meetingLocation = link;
        }
    }

    public void setInstructions(String instructions) {
        if (this.reason == null || this.reason.isBlank()) {
            this.reason = instructions;
        }
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }
}
