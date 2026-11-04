package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryResponse {
    private long totalOpenVacancies;
    private long pendingApprovals;
    private long activeCandidates;
    private long upcomingInterviewsToday;
    private long overdueRequisitionsCount;
    private double avgTatDays;
    private Map<String, Long> statusBreakdown;
    private Map<String, Long> departmentBreakdown;
    private List<RequisitionResponse> recentRequisitions;
    private List<TatSummaryResponse> tatAlerts;
}
