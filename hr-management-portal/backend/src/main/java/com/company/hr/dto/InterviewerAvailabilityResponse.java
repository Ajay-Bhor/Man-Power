package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewerAvailabilityResponse {

    private Long interviewerId;
    private String interviewerName;
    private String designation;
    private boolean eligible;
    private boolean active;
    private boolean available;
    private boolean hasConflict;
    private String conflictReason;
    private LocalDateTime conflictingInterviewTime;
    private String message;
}
