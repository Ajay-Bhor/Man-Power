package com.company.hr.repository;

import com.company.hr.entity.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    Optional<Candidate> findByCandidateCode(String candidateCode);
    Page<Candidate> findByRequisitionId(Long requisitionId, Pageable pageable);
    List<Candidate> findByRequisitionId(Long requisitionId);
    Page<Candidate> findByStatus(Candidate.CandidateStatus status, Pageable pageable);
    long countByStatus(Candidate.CandidateStatus status);

    @Query("SELECT c.status, COUNT(c) FROM Candidate c GROUP BY c.status")
    List<Object[]> countCandidatesByPipelineStage();

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE (:deptId IS NULL OR r.department.id = :deptId)")
    long countTotal(@Param("deptId") Long deptId);

    @Query("SELECT COUNT(c) FROM Candidate c LEFT JOIN c.requisition r WHERE c.status = :status AND (:deptId IS NULL OR r.department.id = :deptId)")
    long countByStatusAndDept(@Param("status") Candidate.CandidateStatus status, @Param("deptId") Long deptId);

    long countByRequisitionAssignedRecruiterId(Long recruiterId);

    long countByRequisitionAssignedRecruiterIdAndStatus(Long recruiterId, Candidate.CandidateStatus status);

    @Query("SELECT c FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "WHERE (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.mobile) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.primarySkills) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.currentDesignation) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.jobTitle) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:reqId IS NULL OR r.id = :reqId) " +
           "AND (:deptName IS NULL OR LOWER(d.departmentName) = LOWER(:deptName)) " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:source IS NULL OR c.source = :source) " +
           "AND (:deptRestrictionId IS NULL OR d.id = :deptRestrictionId)")
    Page<Candidate> filterCandidates(
            @Param("search") String search,
            @Param("reqId") Long reqId,
            @Param("deptName") String deptName,
            @Param("status") Candidate.CandidateStatus status,
            @Param("source") Candidate.CandidateSource source,
            @Param("deptRestrictionId") Long deptRestrictionId,
            Pageable pageable);

    @Query("SELECT DISTINCT c FROM Candidate c " +
           "LEFT JOIN c.requisition r " +
           "LEFT JOIN r.department d " +
           "LEFT JOIN Interview i ON i.candidate.id = c.id " +
           "WHERE (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.mobile) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.primarySkills) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.currentDesignation) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.jobTitle) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:reqId IS NULL OR r.id = :reqId) " +
           "AND (:deptName IS NULL OR LOWER(d.departmentName) = LOWER(:deptName)) " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:source IS NULL OR c.source = :source) " +
           "AND (:deptRestrictionId IS NULL OR d.id = :deptRestrictionId) " +
           "AND (:recruiterId IS NULL OR r.assignedRecruiter.id = :recruiterId) " +
           "AND (:interviewerId IS NULL OR i.interviewer.id = :interviewerId)")
    Page<Candidate> filterCandidatesWithRoleScope(
            @Param("search") String search,
            @Param("reqId") Long reqId,
            @Param("deptName") String deptName,
            @Param("status") Candidate.CandidateStatus status,
            @Param("source") Candidate.CandidateSource source,
            @Param("deptRestrictionId") Long deptRestrictionId,
            @Param("recruiterId") Long recruiterId,
            @Param("interviewerId") Long interviewerId,
            Pageable pageable);
}

