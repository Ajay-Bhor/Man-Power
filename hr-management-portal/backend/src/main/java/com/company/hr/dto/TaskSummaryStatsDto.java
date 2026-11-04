package com.company.hr.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSummaryStatsDto {
    private long totalTasks;
    private long assignedTasks;
    private long inProgressTasks;
    private long completedTasks;
    private long overdueTasks;
}
