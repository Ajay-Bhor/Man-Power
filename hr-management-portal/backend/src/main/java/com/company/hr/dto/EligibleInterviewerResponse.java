package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EligibleInterviewerResponse {

    private Long id;
    private String name;
    private String email;
    private String username;
    private String designation;
    private String title;
    private String department;
    private String status;
    private List<String> roles;
    private boolean eligible;
}
