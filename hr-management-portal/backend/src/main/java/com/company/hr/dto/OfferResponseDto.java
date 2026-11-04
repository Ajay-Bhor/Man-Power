package com.company.hr.dto;

import com.company.hr.entity.Offer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferResponseDto {

    private Long id;
    private String offerCode;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidateMobile;
    private String candidateAvatar;
    private Long requisitionId;
    private String requisitionCode;
    private String jobTitle;
    private String department;
    private String location;
    private LocalDate offerDate;
    private LocalDate joiningDate;

    // Confidential compensation - masked if role is restricted (e.g. Interviewer)
    private BigDecimal ctcFixed;
    private BigDecimal ctcVariable;
    private BigDecimal ctcTotal;
    private boolean compensationMasked;

    private Offer.OfferStatus status;
    private Offer.OnboardingStatus onboardingStatus;
    private String approvalStage;
    private String offerLetterUrl;
    private String declineReason;
    private String notes;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Onboarding progress summary
    private int onboardingTotalTasks;
    private int onboardingCompletedTasks;
    private int onboardingProgressPercent;
}
