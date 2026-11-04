package com.company.hr.repository;

import com.company.hr.entity.Interview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByRequisitionId(Long requisitionId);
    List<Interview> findByCandidateId(Long candidateId);
    Page<Interview> findByInterviewerId(Long interviewerId, Pageable pageable);
    List<Interview> findByInterviewerId(Long interviewerId);
    Page<Interview> findByRequisitionAssignedRecruiterId(Long recruiterId, Pageable pageable);
    List<Interview> findByRequisitionAssignedRecruiterId(Long recruiterId);
    List<Interview> findByScheduledAtBetweenAndStatus(LocalDateTime start, LocalDateTime end, Interview.InterviewStatus status);
    long countByStatus(Interview.InterviewStatus status);
    long countByInterviewerId(Long interviewerId);
    long countByInterviewerIdAndStatus(Long interviewerId, Interview.InterviewStatus status);
    long countByRequisitionAssignedRecruiterId(Long recruiterId);
    boolean existsByCandidateIdAndInterviewerId(Long candidateId, Long interviewerId);
}

