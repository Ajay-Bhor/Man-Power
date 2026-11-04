package com.company.hr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskCreateRequest {

    @NotBlank(message = "Task title is required")
    private String taskTitle;

    private String taskDescription;

    @NotBlank(message = "Task type is required")
    private String taskType;

    @NotNull(message = "Assigned user is required")
    private Long assignedUserId;

    private Long requisitionId;

    private Long candidateId;

    @NotBlank(message = "Priority is required")
    private String priority;

    private LocalDate startDate;

    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    private String status;

    private String comments;
}
