package com.company.hr.dto;

import com.company.hr.entity.Offer;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferWorkflowRequest {

    @NotNull(message = "New status is required")
    private Offer.OfferStatus status;

    private Offer.OnboardingStatus onboardingStatus;

    private String declineReason;

    private LocalDate joiningDate;

    private String notes;
}
