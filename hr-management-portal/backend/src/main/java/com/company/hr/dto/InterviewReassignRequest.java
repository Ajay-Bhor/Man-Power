package com.company.hr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewReassignRequest {

    @NotNull(message = "New interviewer ID is required")
    private Long newInterviewerId;

    private String reason;
}
