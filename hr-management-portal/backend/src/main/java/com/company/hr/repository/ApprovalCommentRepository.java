package com.company.hr.repository;

import com.company.hr.entity.ApprovalComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalCommentRepository extends JpaRepository<ApprovalComment, Long> {
    List<ApprovalComment> findByApprovalIdOrderByCreatedAtAsc(Long approvalId);
}
