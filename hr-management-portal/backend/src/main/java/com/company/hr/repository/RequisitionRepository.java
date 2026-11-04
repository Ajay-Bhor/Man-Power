package com.company.hr.repository;

import com.company.hr.entity.Requisition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RequisitionRepository extends JpaRepository<Requisition, Long> {
    Optional<Requisition> findByRequisitionCode(String requisitionCode);

    Page<Requisition> findByDepartmentId(Long departmentId, Pageable pageable);

    Page<Requisition> findByStatus(Requisition.RequisitionStatus status, Pageable pageable);

    Page<Requisition> findByAssignedRecruiterId(Long recruiterId, Pageable pageable);

    List<Requisition> findByAssignedRecruiterId(Long recruiterId);

    long countByAssignedRecruiterId(Long recruiterId);

    List<Requisition> findByAssignedRecruiterIdAndStatusNotIn(Long recruiterId, List<Requisition.RequisitionStatus> statuses);

    @Query("SELECT DISTINCT r FROM Requisition r JOIN Interview i ON i.requisition.id = r.id WHERE i.interviewer.id = :interviewerId")
    Page<Requisition> findByInterviewerId(@Param("interviewerId") Long interviewerId, Pageable pageable);

    @Query("SELECT r FROM Requisition r WHERE r.status NOT IN ('FILLED', 'CLOSED', 'REJECTED') AND r.dueDate < :today")
    List<Requisition> findOverdueRequisitions(@Param("today") LocalDate today);

    @Query("SELECT r.status, COUNT(r) FROM Requisition r GROUP BY r.status")
    List<Object[]> countRequisitionsByStatus();

    @Query("SELECT r.department.departmentName, COUNT(r), SUM(r.headcount) FROM Requisition r GROUP BY r.department.departmentName")
    List<Object[]> countVacanciesByDepartment();

    long countByStatusIn(List<Requisition.RequisitionStatus> statuses);
}

