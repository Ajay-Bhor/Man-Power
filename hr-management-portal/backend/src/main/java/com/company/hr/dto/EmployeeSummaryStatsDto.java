package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSummaryStatsDto {
    private long totalEmployees;
    private long activeEmployees;
    private long onProbation;
    private long confirmationDue;
    private long noticePeriod;
    private long resignedExited;
    private long newJoinersThisMonth;

    // Trend percentage indicators matching screenshot
    private String totalEmployeesTrend; // e.g. "↑ 4% vs last month"
    private String activeEmployeesTrend; // e.g. "↑ 3% vs last month"
    private String onProbationTrend; // e.g. "0% vs last month"
    private String resignedExitedTrend; // e.g. "↑ 50% vs last month"
    private String newJoinersTrend; // e.g. "↑ 67% vs last month"
}
