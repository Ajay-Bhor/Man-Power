package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferSummaryStatsDto {
    private long totalOffers;
    private long offersSent;
    private long accepted;
    private long declined;
    private long joiningScheduled;
    private long onboardingInProgress;
    private long onboarded;
}
