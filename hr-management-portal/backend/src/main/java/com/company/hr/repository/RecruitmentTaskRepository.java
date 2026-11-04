package com.company.hr.repository;

import com.company.hr.entity.RecruitmentTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RecruitmentTaskRepository extends JpaRepository<RecruitmentTask, Long> {

    List<RecruitmentTask> findByAssignedUserId(Long userId);
    List<RecruitmentTask> findByAssignedUserIdOrderByDueDateAsc(Long userId);
    List<RecruitmentTask> findByAssignedUserIdAndStatus(Long userId, RecruitmentTask.TaskStatus status);
    List<RecruitmentTask> findByRequisitionId(Long requisitionId);
    List<RecruitmentTask> findByCandidateId(Long candidateId);
    List<RecruitmentTask> findByDueDateBeforeAndStatusNotIn(LocalDate date, List<RecruitmentTask.TaskStatus> statuses);

    long countByStatus(RecruitmentTask.TaskStatus status);
    long countByStatusIn(List<RecruitmentTask.TaskStatus> statuses);
    long countByAssignedUserId(Long userId);
    long countByAssignedUserIdAndStatus(Long userId, RecruitmentTask.TaskStatus status);
    long countByAssignedUserIdAndStatusIn(Long userId, List<RecruitmentTask.TaskStatus> statuses);

    @Query("SELECT t FROM RecruitmentTask t WHERE " +
           "(:assignedUserId IS NULL OR t.assignedUser.id = :assignedUserId) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:taskType IS NULL OR t.taskType = :taskType) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:search IS NULL OR LOWER(t.taskTitle) LIKE :search OR " +
           " LOWER(t.taskDescription) LIKE :search)")
    Page<RecruitmentTask> filterTasks(
            @Param("assignedUserId") Long assignedUserId,
            @Param("status") RecruitmentTask.TaskStatus status,
            @Param("taskType") RecruitmentTask.TaskType taskType,
            @Param("priority") RecruitmentTask.TaskPriority priority,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT t.assignedUser.id, count(t) FROM RecruitmentTask t " +
           "WHERE t.status NOT IN (com.company.hr.entity.RecruitmentTask.TaskStatus.COMPLETED, com.company.hr.entity.RecruitmentTask.TaskStatus.CANCELLED) " +
           "GROUP BY t.assignedUser.id")
    List<Object[]> countActiveTasksByUser();
}
