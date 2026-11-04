package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeStatusHistoryDto {
    private Long id;
    private Long employeeId;
    private String previousStatus;
    private String newStatus;
    private String changeReason;
    private Long changedByUserId;
    private String changedByName;
    private LocalDateTime createdAt;
}
