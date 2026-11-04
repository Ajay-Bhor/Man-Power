package com.company.hr.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleAssigneeDto {
    private Long id;
    private String name;
    private String email;
    private String role;
    private List<String> roles;
    private String department;
    private String designation;
    private String status;
    private long activeTasksCount;
}
