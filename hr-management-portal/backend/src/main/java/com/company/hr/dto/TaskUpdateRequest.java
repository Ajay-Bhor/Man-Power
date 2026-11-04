package com.company.hr.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskUpdateRequest {

    private String taskTitle;
    private String taskDescription;
    private String taskType;
    private Long assignedUserId;
    private Long requisitionId;
    private Long candidateId;
    private String priority;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String status;
    private String comments;
}
