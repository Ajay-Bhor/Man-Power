package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateStatsDto {
    private long totalCandidates;
    private long newApplications;
    private long newThisWeek;
    private long inScreening;
    private long inInterview;
    private long offerStage;
    private long rejected;
}
