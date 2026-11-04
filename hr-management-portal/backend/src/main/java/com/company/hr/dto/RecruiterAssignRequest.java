package com.company.hr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterAssignRequest {

    @NotNull(message = "Recruiter ID is required")
    private Long recruiterId;

    private LocalDate tatStartDate;

    private Integer targetDays;
}
