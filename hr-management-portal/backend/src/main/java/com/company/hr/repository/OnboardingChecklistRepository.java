package com.company.hr.repository;

import com.company.hr.entity.OnboardingChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnboardingChecklistRepository extends JpaRepository<OnboardingChecklist, Long> {

    List<OnboardingChecklist> findByOfferIdOrderByIdAsc(Long offerId);

    int countByOfferId(Long offerId);

    int countByOfferIdAndIsCompletedTrue(Long offerId);
}
