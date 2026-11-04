package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingItemDto {
    private Long id;
    private Long offerId;
    private String category;
    private String itemName;
    private Boolean isCompleted;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String documentUrl;
    private String notes;
}
