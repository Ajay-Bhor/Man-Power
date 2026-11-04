package com.company.hr.repository;

import com.company.hr.entity.Approval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ApprovalRepository extends JpaRepository<Approval, Long>, JpaSpecificationExecutor<Approval> {

    Optional<Approval> findByApprovalCode(String approvalCode);

    long countByStatus(Approval.ApprovalStatus status);

    @Query("SELECT COUNT(a) FROM Approval a WHERE a.status = :status AND a.decisionDate >= :since")
    long countByStatusAndDecisionDateAfter(
            @Param("status") Approval.ApprovalStatus status,
            @Param("since") LocalDateTime since
    );

    @Query("SELECT COUNT(a) FROM Approval a WHERE a.assignedApprover.id = :userId OR a.requestedBy.id = :userId OR a.decisionBy.id = :userId")
    long countMyApprovals(@Param("userId") Long userId);

    long countByApprovalTypeAndStatus(Approval.ApprovalType approvalType, Approval.ApprovalStatus status);

    long countByApprovalType(Approval.ApprovalType approvalType);
}
