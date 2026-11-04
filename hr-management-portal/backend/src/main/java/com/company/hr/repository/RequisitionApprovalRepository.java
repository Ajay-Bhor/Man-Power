package com.company.hr.repository;

import com.company.hr.entity.RequisitionApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RequisitionApprovalRepository extends JpaRepository<RequisitionApproval, Long> {
    List<RequisitionApproval> findByRequisitionId(Long requisitionId);
    List<RequisitionApproval> findByApproverIdAndDecision(Long approverId, RequisitionApproval.ApprovalDecision decision);
    Optional<RequisitionApproval> findByRequisitionIdAndApprovalStage(Long requisitionId, RequisitionApproval.ApprovalStage approvalStage);
}
