package com.company.hr.service;

import com.company.hr.dto.*;
import com.company.hr.entity.*;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.*;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final RecruitmentTaskRepository taskRepository;
    private final UserRepository userRepository;
    private final RequisitionRepository requisitionRepository;
    private final CandidateRepository candidateRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;

    public boolean isHrAdmin(UserPrincipal user) {
        if (user == null || user.getAuthorities() == null) return false;
        return user.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_HR_ADMIN") ||
                a.getAuthority().equalsIgnoreCase("ROLE_HRBP"));
    }

    public boolean isUserEligibleForTaskType(User user, RecruitmentTask.TaskType taskType) {
        if (user == null || user.getStatus() != User.UserStatus.ACTIVE) return false;
        Set<String> roles = user.getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toSet());

        switch (taskType) {
            case REQUISITION_REVIEW:
                return roles.contains("ROLE_HR_ADMIN") || roles.contains("ROLE_DEPT_HEAD")
                        || roles.contains("ROLE_APPROVING_MANAGER") || roles.contains("ROLE_SENIOR_MGMT")
                        || roles.contains("ROLE_HRBP");
            case CANDIDATE_SCREENING:
            case INTERVIEW_COORDINATION:
            case OFFER_PROCESSING:
            case ONBOARDING_FOLLOW_UP:
                return roles.contains("ROLE_HR_RECRUITER") || roles.contains("ROLE_HR_ADMIN")
                        || roles.contains("ROLE_HRBP");
            case INTERVIEW_FEEDBACK:
                return roles.contains("ROLE_INTERVIEWER") || roles.contains("ROLE_DEPT_HEAD")
                        || roles.contains("ROLE_APPROVING_MANAGER") || roles.contains("ROLE_HR_RECRUITER")
                        || roles.contains("ROLE_HR_ADMIN") || roles.contains("ROLE_EMPLOYEE");
            case OTHER:
            default:
                return true;
        }
    }

    @Transactional(readOnly = true)
    public Page<TaskResponseDto> getTasks(
            String statusStr,
            String taskTypeStr,
            String priorityStr,
            Long requestedAssignedUserId,
            String search,
            UserPrincipal currentUser,
            Pageable pageable) {

        boolean isAuthorizedAdmin = isHrAdmin(currentUser);
        Long effectiveAssignedUserId = requestedAssignedUserId;

        // Strict role-scoping: Regular Recruiters and Interviewers can ONLY see their own tasks
        if (!isAuthorizedAdmin) {
            effectiveAssignedUserId = currentUser.getId();
        }

        RecruitmentTask.TaskStatus status = null;
        if (statusStr != null && !statusStr.isBlank() && !statusStr.equalsIgnoreCase("ALL")) {
            try {
                status = RecruitmentTask.TaskStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        RecruitmentTask.TaskType taskType = null;
        if (taskTypeStr != null && !taskTypeStr.isBlank() && !taskTypeStr.equalsIgnoreCase("ALL")) {
            try {
                taskType = RecruitmentTask.TaskType.valueOf(taskTypeStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        RecruitmentTask.TaskPriority priority = null;
        if (priorityStr != null && !priorityStr.isBlank() && !priorityStr.equalsIgnoreCase("ALL")) {
            try {
                priority = RecruitmentTask.TaskPriority.valueOf(priorityStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        String searchPattern = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;

        Page<RecruitmentTask> page = taskRepository.filterTasks(
                effectiveAssignedUserId, status, taskType, priority, searchPattern, pageable);

        return page.map(t -> toDto(t, currentUser));
    }

    @Transactional(readOnly = true)
    public TaskResponseDto getTaskById(Long id, UserPrincipal currentUser) {
        RecruitmentTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + id));

        boolean isAuthorizedAdmin = isHrAdmin(currentUser);
        if (!isAuthorizedAdmin && !task.getAssignedUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have permission to view this task");
        }

        return toDto(task, currentUser);
    }

    @Transactional(readOnly = true)
    public TaskSummaryStatsDto getSummaryStats(UserPrincipal currentUser) {
        boolean isAuthorizedAdmin = isHrAdmin(currentUser);
        Long userId = isAuthorizedAdmin ? null : currentUser.getId();

        if (userId == null) {
            long total = taskRepository.count();
            long assigned = taskRepository.countByStatus(RecruitmentTask.TaskStatus.ASSIGNED)
                    + taskRepository.countByStatus(RecruitmentTask.TaskStatus.PENDING);
            long inProgress = taskRepository.countByStatus(RecruitmentTask.TaskStatus.IN_PROGRESS);
            long completed = taskRepository.countByStatus(RecruitmentTask.TaskStatus.COMPLETED);
            long overdue = taskRepository.findByDueDateBeforeAndStatusNotIn(
                    LocalDate.now(),
                    List.of(RecruitmentTask.TaskStatus.COMPLETED, RecruitmentTask.TaskStatus.CANCELLED)
            ).size();

            return TaskSummaryStatsDto.builder()
                    .totalTasks(total)
                    .assignedTasks(assigned)
                    .inProgressTasks(inProgress)
                    .completedTasks(completed)
                    .overdueTasks(overdue)
                    .build();
        } else {
            long total = taskRepository.countByAssignedUserId(userId);
            long assigned = taskRepository.countByAssignedUserIdAndStatusIn(
                    userId, List.of(RecruitmentTask.TaskStatus.ASSIGNED, RecruitmentTask.TaskStatus.PENDING));
            long inProgress = taskRepository.countByAssignedUserIdAndStatus(
                    userId, RecruitmentTask.TaskStatus.IN_PROGRESS);
            long completed = taskRepository.countByAssignedUserIdAndStatus(
                    userId, RecruitmentTask.TaskStatus.COMPLETED);
            long overdue = taskRepository.findByAssignedUserId(userId).stream()
                    .filter(t -> t.getDueDate().isBefore(LocalDate.now()) &&
                            t.getStatus() != RecruitmentTask.TaskStatus.COMPLETED &&
                            t.getStatus() != RecruitmentTask.TaskStatus.CANCELLED)
                    .count();

            return TaskSummaryStatsDto.builder()
                    .totalTasks(total)
                    .assignedTasks(assigned)
                    .inProgressTasks(inProgress)
                    .completedTasks(completed)
                    .overdueTasks(overdue)
                    .build();
        }
    }

    @Transactional(readOnly = true)
    public List<EligibleAssigneeDto> getEligibleAssignees(String taskTypeStr) {
        RecruitmentTask.TaskType taskType = RecruitmentTask.TaskType.OTHER;
        if (taskTypeStr != null && !taskTypeStr.isBlank()) {
            try {
                taskType = RecruitmentTask.TaskType.valueOf(taskTypeStr.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        final RecruitmentTask.TaskType effectiveType = taskType;

        // Fetch active task count map
        Map<Long, Long> activeCountMap = new HashMap<>();
        List<Object[]> counts = taskRepository.countActiveTasksByUser();
        for (Object[] row : counts) {
            Long uid = (Long) row[0];
            Long cnt = (Long) row[1];
            activeCountMap.put(uid, cnt);
        }

        List<User> activeUsers = userRepository.findAll().stream()
                .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .filter(u -> isUserEligibleForTaskType(u, effectiveType))
                .sorted(Comparator.comparing(User::getName))
                .collect(Collectors.toList());

        return activeUsers.stream().map(u -> {
            List<String> roleNames = u.getRoles().stream()
                    .map(Role::getRoleName)
                    .collect(Collectors.toList());
            String primaryRole = roleNames.isEmpty() ? "ROLE_EMPLOYEE" : roleNames.get(0);
            return EligibleAssigneeDto.builder()
                    .id(u.getId())
                    .name(u.getName())
                    .email(u.getEmail())
                    .role(primaryRole)
                    .roles(roleNames)
                    .department(u.getDepartmentRestrictionId() != null ? "Department #" + u.getDepartmentRestrictionId() : "Human Resources")
                    .designation(u.getDesignation())
                    .status(u.getStatus().name())
                    .activeTasksCount(activeCountMap.getOrDefault(u.getId(), 0L))
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public TaskResponseDto createTask(TaskCreateRequest request, UserPrincipal currentUser) {
        if (!isHrAdmin(currentUser)) {
            throw new AccessDeniedException("Only authorized HR Administrators can assign recruitment tasks");
        }

        User assignedUser = userRepository.findById(request.getAssignedUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found with ID: " + request.getAssignedUserId()));

        if (assignedUser.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Cannot assign task to user '" + assignedUser.getName() + "' because account status is " + assignedUser.getStatus() + ". Only ACTIVE users can receive assignments.");
        }

        RecruitmentTask.TaskType taskType;
        try {
            taskType = RecruitmentTask.TaskType.valueOf(request.getTaskType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid task type: " + request.getTaskType());
        }

        if (!isUserEligibleForTaskType(assignedUser, taskType)) {
            throw new BadRequestException("User '" + assignedUser.getName() + "' is not eligible for task type '" + taskType + "' under assigned security roles.");
        }

        RecruitmentTask.TaskPriority priority = RecruitmentTask.TaskPriority.MEDIUM;
        if (request.getPriority() != null) {
            try {
                priority = RecruitmentTask.TaskPriority.valueOf(request.getPriority().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        RecruitmentTask.TaskStatus status = RecruitmentTask.TaskStatus.ASSIGNED;
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                status = RecruitmentTask.TaskStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        Requisition requisition = null;
        if (request.getRequisitionId() != null) {
            requisition = requisitionRepository.findById(request.getRequisitionId()).orElse(null);
        }

        Candidate candidate = null;
        if (request.getCandidateId() != null) {
            candidate = candidateRepository.findById(request.getCandidateId()).orElse(null);
        }

        User assignedBy = userRepository.findById(currentUser.getId()).orElse(null);

        RecruitmentTask task = RecruitmentTask.builder()
                .taskTitle(request.getTaskTitle().trim())
                .taskType(taskType)
                .taskDescription(request.getTaskDescription())
                .comments(request.getComments())
                .assignedUser(assignedUser)
                .assignedByUser(assignedBy)
                .requisition(requisition)
                .candidate(candidate)
                .priority(priority)
                .status(status)
                .startDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now())
                .dueDate(request.getDueDate())
                .build();

        RecruitmentTask saved = taskRepository.save(task);

        // Audit Log
        recordAudit(currentUser, "TASK_ASSIGNED", saved.getId(),
                "Assigned task '" + saved.getTaskTitle() + "' to " + assignedUser.getName() + " (" + taskType + ")");

        // Notification
        notificationService.notifyUser(assignedUser,
                "New Task Assigned: " + saved.getTaskTitle(),
                "You have been assigned a new " + taskType.name().replace("_", " ") + " task due by " + saved.getDueDate() + ".",
                "/tasks/" + saved.getId());

        return toDto(saved, currentUser);
    }

    @Transactional
    public TaskResponseDto updateTask(Long id, TaskUpdateRequest request, UserPrincipal currentUser) {
        RecruitmentTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + id));

        boolean isAuthorizedAdmin = isHrAdmin(currentUser);
        boolean isAssignee = task.getAssignedUser().getId().equals(currentUser.getId());

        if (!isAuthorizedAdmin && !isAssignee) {
            throw new AccessDeniedException("You do not have permission to update this task");
        }

        // Reassignment: ONLY HR Admin
        if (request.getAssignedUserId() != null && !request.getAssignedUserId().equals(task.getAssignedUser().getId())) {
            if (!isAuthorizedAdmin) {
                throw new AccessDeniedException("Only HR Administrators can reassign tasks");
            }
            User newAssignee = userRepository.findById(request.getAssignedUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("New assigned user not found with ID: " + request.getAssignedUserId()));

            if (newAssignee.getStatus() != User.UserStatus.ACTIVE) {
                throw new BadRequestException("Cannot reassign task to user '" + newAssignee.getName() + "' because account status is " + newAssignee.getStatus() + ". Only ACTIVE users can receive assignments.");
            }

            if (!isUserEligibleForTaskType(newAssignee, task.getTaskType())) {
                throw new BadRequestException("User '" + newAssignee.getName() + "' is not eligible for task type '" + task.getTaskType() + "' under assigned security roles.");
            }

            User oldAssignee = task.getAssignedUser();
            task.setAssignedUser(newAssignee);

            recordAudit(currentUser, "TASK_REASSIGNED", task.getId(),
                    "Reassigned task '" + task.getTaskTitle() + "' from " + oldAssignee.getName() + " to " + newAssignee.getName());

            notificationService.notifyUser(newAssignee,
                    "Task Reassigned to You: " + task.getTaskTitle(),
                    "You have been assigned task '" + task.getTaskTitle() + "' due on " + task.getDueDate() + ".",
                    "/tasks/" + task.getId());
        }

        // Status update
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                RecruitmentTask.TaskStatus newStatus = RecruitmentTask.TaskStatus.valueOf(request.getStatus().toUpperCase());
                task.setStatus(newStatus);
                if (newStatus == RecruitmentTask.TaskStatus.COMPLETED) {
                    task.setCompletedAt(LocalDateTime.now());
                }
            } catch (IllegalArgumentException ignored) {}
        }

        // Comments update (allowed for assignee & HR Admin)
        if (request.getComments() != null) {
            task.setComments(request.getComments());
        }

        // Full metadata updates: HR Admin only
        if (isAuthorizedAdmin) {
            if (request.getTaskTitle() != null && !request.getTaskTitle().isBlank()) {
                task.setTaskTitle(request.getTaskTitle().trim());
            }
            if (request.getTaskDescription() != null) {
                task.setTaskDescription(request.getTaskDescription());
            }
            if (request.getTaskType() != null && !request.getTaskType().isBlank()) {
                try {
                    task.setTaskType(RecruitmentTask.TaskType.valueOf(request.getTaskType().toUpperCase()));
                } catch (IllegalArgumentException ignored) {}
            }
            if (request.getPriority() != null && !request.getPriority().isBlank()) {
                try {
                    task.setPriority(RecruitmentTask.TaskPriority.valueOf(request.getPriority().toUpperCase()));
                } catch (IllegalArgumentException ignored) {}
            }
            if (request.getStartDate() != null) {
                task.setStartDate(request.getStartDate());
            }
            if (request.getDueDate() != null) {
                task.setDueDate(request.getDueDate());
            }
            if (request.getRequisitionId() != null) {
                Requisition req = requisitionRepository.findById(request.getRequisitionId()).orElse(null);
                task.setRequisition(req);
            }
            if (request.getCandidateId() != null) {
                Candidate cand = candidateRepository.findById(request.getCandidateId()).orElse(null);
                task.setCandidate(cand);
            }
        }

        RecruitmentTask updated = taskRepository.save(task);

        recordAudit(currentUser, "TASK_UPDATED", updated.getId(),
                "Updated task '" + updated.getTaskTitle() + "' status to " + updated.getStatus());

        return toDto(updated, currentUser);
    }

    @Transactional
    public void deleteTask(Long id, UserPrincipal currentUser) {
        if (!isHrAdmin(currentUser)) {
            throw new AccessDeniedException("Only authorized HR Administrators can delete or cancel tasks");
        }
        RecruitmentTask task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + id));

        taskRepository.delete(task);

        recordAudit(currentUser, "TASK_DELETED", id, "Deleted recruitment task: " + task.getTaskTitle());
    }

    private void recordAudit(UserPrincipal currentUser, String action, Long taskId, String details) {
        try {
            AuditLog log = AuditLog.builder()
                    .actorId(currentUser != null ? currentUser.getId() : null)
                    .actorName(currentUser != null ? currentUser.getName() : "System")
                    .action(action)
                    .entityType("RECRUITMENT_TASK")
                    .entityId(String.valueOf(taskId))
                    .newValue("{\"details\":\"" + details.replace("\"", "'") + "\"}")
                    .ipAddress("127.0.0.1")
                    .build();
            auditLogRepository.save(log);
        } catch (Exception e) {
            log.warn("Failed to record task audit log: {}", e.getMessage());
        }
    }

    public TaskResponseDto toDto(RecruitmentTask t, UserPrincipal currentUser) {
        boolean isAuthorizedAdmin = isHrAdmin(currentUser);
        boolean isAssignee = currentUser != null && t.getAssignedUser().getId().equals(currentUser.getId());

        String taskTypeLabel = switch (t.getTaskType()) {
            case REQUISITION_REVIEW -> "Requisition Review";
            case CANDIDATE_SCREENING -> "Candidate Screening";
            case INTERVIEW_COORDINATION -> "Interview Scheduling";
            case INTERVIEW_FEEDBACK -> "Interview Feedback";
            case OFFER_PROCESSING -> "Offer Processing";
            case ONBOARDING_FOLLOW_UP -> "Onboarding Follow-up";
            default -> "Other";
        };

        boolean isOverdue = t.getDueDate() != null &&
                t.getDueDate().isBefore(LocalDate.now()) &&
                t.getStatus() != RecruitmentTask.TaskStatus.COMPLETED &&
                t.getStatus() != RecruitmentTask.TaskStatus.CANCELLED;

        List<String> assignedUserRoles = t.getAssignedUser().getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toList());
        String primaryRole = assignedUserRoles.isEmpty() ? "ROLE_EMPLOYEE" : assignedUserRoles.get(0);

        return TaskResponseDto.builder()
                .id(t.getId())
                .taskTitle(t.getTaskTitle())
                .taskDescription(t.getTaskDescription())
                .taskType(t.getTaskType().name())
                .taskTypeLabel(taskTypeLabel)
                .assignedUserId(t.getAssignedUser().getId())
                .assignedUserName(t.getAssignedUser().getName())
                .assignedUserEmail(t.getAssignedUser().getEmail())
                .assignedUserRole(primaryRole)
                .assignedUserAvatar(t.getAssignedUser().getProfileImageUrl())
                .assignedByUserId(t.getAssignedByUser() != null ? t.getAssignedByUser().getId() : null)
                .assignedByName(t.getAssignedByUser() != null ? t.getAssignedByUser().getName() : "HR Admin")
                .requisitionId(t.getRequisition() != null ? t.getRequisition().getId() : null)
                .requisitionCode(t.getRequisition() != null ? t.getRequisition().getRequisitionCode() : null)
                .jobTitle(t.getRequisition() != null ? t.getRequisition().getJobTitle() : null)
                .candidateId(t.getCandidate() != null ? t.getCandidate().getId() : null)
                .candidateCode(t.getCandidate() != null ? t.getCandidate().getCandidateCode() : null)
                .candidateName(t.getCandidate() != null ? t.getCandidate().getName() : null)
                .priority(t.getPriority().name())
                .startDate(t.getStartDate())
                .dueDate(t.getDueDate())
                .status(t.getStatus().name())
                .comments(t.getComments())
                .isOverdue(isOverdue)
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .canEdit(isAuthorizedAdmin)
                .canReassign(isAuthorizedAdmin)
                .canComplete(isAuthorizedAdmin || isAssignee)
                .build();
    }
}
