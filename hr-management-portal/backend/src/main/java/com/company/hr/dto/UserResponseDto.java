package com.company.hr.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private String name;
    private String email;
    private String role;
    private List<String> roles;
    private Long departmentId;
    private String department;
    private String designation;
    private String phoneNumber;
    private String status;
    private long assignedTasksCount;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}
