package com.company.hr.repository;

import com.company.hr.entity.RequisitionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequisitionHistoryRepository extends JpaRepository<RequisitionHistory, Long> {
    List<RequisitionHistory> findByRequisitionIdOrderByTimestampDesc(Long requisitionId);
}
