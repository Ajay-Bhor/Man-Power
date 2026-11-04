package com.company.hr.dto;

import com.company.hr.entity.Interview;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewScheduleRequest {

    @NotNull(message = "Candidate ID is required")
    private Long candidateId;

    @NotNull(message = "Requisition ID is required")
    private Long requisitionId;

    private Interview.InterviewRound round;

    @NotNull(message = "Interviewer ID is required")
    private Long interviewerId;

    private LocalDateTime scheduledAt;

    private Integer durationMinutes;
    private String mode;
    private String meetingLink;
    private String meetingLocation;
    private String instructions;

    public Interview.InterviewRound getRound() {
        if (this.round != null) return this.round;
        return Interview.InterviewRound.TECHNICAL_R1;
    }

    public void setRoundName(String name) {
        if (name == null) return;
        String upper = name.toUpperCase();
        if (upper.contains("ROUND 2") || upper.contains("TECHNICAL_R2") || upper.contains("ROUND_2")) {
            this.round = Interview.InterviewRound.TECHNICAL_R2;
        } else if (upper.contains("MANAGERIAL") || upper.contains("MANAGER")) {
            this.round = Interview.InterviewRound.MANAGERIAL;
        } else if (upper.contains("HR") || upper.contains("SCREENING")) {
            this.round = Interview.InterviewRound.HR_SCREENING;
        } else if (upper.contains("FINAL") || upper.contains("DIRECTOR") || upper.contains("CULTURE")) {
            this.round = Interview.InterviewRound.DIRECTOR_FINAL;
        } else {
            this.round = Interview.InterviewRound.TECHNICAL_R1;
        }
    }

    public LocalDateTime getScheduledAt() {
        if (this.scheduledAt != null) return this.scheduledAt;
        return LocalDateTime.now().plusDays(1).withHour(11).withMinute(0);
    }

    public void setScheduledTime(String timeStr) {
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

    public String getMode() {
        return this.mode != null ? this.mode : "ONLINE";
    }

    public void setMode(String mode) {
        this.mode = mode;
    }
}
