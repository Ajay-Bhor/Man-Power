package com.company.hr.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponseDto {

    private Long id;
    private String taskTitle;
    private String taskDescription;
    private String taskType;
    private String taskTypeLabel;

    private Long assignedUserId;
    private String assignedUserName;
    private String assignedUserEmail;
    private String assignedUserRole;
    private String assignedUserAvatar;

    private Long assignedByUserId;
    private String assignedByName;

    private Long requisitionId;
    private String requisitionCode;
    private String jobTitle;

    private Long candidateId;
    private String candidateCode;
    private String candidateName;

    private String priority;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String status;
    private String comments;

    @com.fasterxml.jackson.annotation.JsonProperty("isOverdue")
    private boolean isOverdue;

    @com.fasterxml.jackson.annotation.JsonProperty("overdue")
    public boolean getOverdue() {
        return isOverdue;
    }

    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean canEdit;
    private boolean canReassign;
    private boolean canComplete;
}
