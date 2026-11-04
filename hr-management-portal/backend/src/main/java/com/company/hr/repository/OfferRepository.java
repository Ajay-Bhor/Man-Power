package com.company.hr.repository;

import com.company.hr.entity.Offer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {

    Optional<Offer> findByOfferCode(String offerCode);

    boolean existsByCandidateIdAndStatusNotIn(Long candidateId, Collection<Offer.OfferStatus> excludedStatuses);

    long countByStatus(Offer.OfferStatus status);

    long countByOnboardingStatus(Offer.OnboardingStatus onboardingStatus);

    @Query("SELECT COUNT(o) FROM Offer o")
    long countTotalOffers();

    @Query("SELECT o FROM Offer o " +
           "WHERE (:search IS NULL OR LOWER(o.candidateName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "       OR LOWER(o.candidateEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "       OR LOWER(o.jobTitle) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "       OR LOWER(o.offerCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:requisitionId IS NULL OR o.requisition.id = :requisitionId) " +
           "AND (:department IS NULL OR LOWER(o.department) = LOWER(:department)) " +
           "AND (:status IS NULL OR o.status = :status) " +
           "AND (:onboardingStatus IS NULL OR o.onboardingStatus = :onboardingStatus) " +
           "AND (:monthStart IS NULL OR o.joiningDate >= :monthStart) " +
           "AND (:monthEnd IS NULL OR o.joiningDate <= :monthEnd)")
    Page<Offer> filterOffers(
            @Param("search") String search,
            @Param("requisitionId") Long requisitionId,
            @Param("department") String department,
            @Param("status") Offer.OfferStatus status,
            @Param("onboardingStatus") Offer.OnboardingStatus onboardingStatus,
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd") LocalDate monthEnd,
            Pageable pageable
    );
}
