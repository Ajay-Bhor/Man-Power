package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalSummaryStatsDto {
    // 4 Summary Cards
    private long pendingApprovals;
    private long approvedToday;
    private long rejectedToday;
    private long myApprovals;

    // 5 Tabs Counts
    private long allCount;
    private long offerApprovalsCount;
    private long requisitionApprovalsCount;
    private long hiringApprovalsCount;
    private long otherApprovalsCount;
}
