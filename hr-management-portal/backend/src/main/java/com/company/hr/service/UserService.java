package com.company.hr.service;

import com.company.hr.dto.UserCreateRequest;
import com.company.hr.dto.UserResponseDto;
import com.company.hr.dto.UserStatsDto;
import com.company.hr.dto.UserUpdateRequest;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.Department;
import com.company.hr.entity.RecruitmentTask;
import com.company.hr.entity.Role;
import com.company.hr.entity.User;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.DepartmentRepository;
import com.company.hr.repository.RecruitmentTaskRepository;
import com.company.hr.repository.RoleRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;
    private final RecruitmentTaskRepository taskRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public UserStatsDto getUserStats() {
        long total = userRepository.count();
        long active = userRepository.countByStatus(User.UserStatus.ACTIVE);
        long inactive = total - active;
        long pendingTasks = taskRepository.countByStatusIn(List.of(
                RecruitmentTask.TaskStatus.ASSIGNED,
                RecruitmentTask.TaskStatus.PENDING,
                RecruitmentTask.TaskStatus.IN_PROGRESS,
                RecruitmentTask.TaskStatus.OVERDUE
        ));
        return UserStatsDto.builder()
                .totalUsers(total)
                .activeUsers(active)
                .inactiveUsers(inactive)
                .pendingTasks(pendingTasks)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UserResponseDto> getAllUsersWithTaskCount() {
        List<User> users = userRepository.findAll();
        Map<Long, Long> taskCountMap = new HashMap<>();
        List<Object[]> counts = taskRepository.countActiveTasksByUser();
        for (Object[] row : counts) {
            Long uid = (Long) row[0];
            Long cnt = (Long) row[1];
            taskCountMap.put(uid, cnt);
        }

        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getDepartmentName, (a, b) -> a));

        return users.stream().map(u -> {
            List<String> roleNames = u.getRoles().stream()
                    .map(Role::getRoleName)
                    .collect(Collectors.toList());
            String primaryRole = roleNames.isEmpty() ? "ROLE_EMPLOYEE" : roleNames.get(0);

            String deptName = "Human Resources";
            if (u.getDepartmentRestrictionId() != null) {
                deptName = deptMap.getOrDefault(u.getDepartmentRestrictionId(), "Department #" + u.getDepartmentRestrictionId());
            }

            return UserResponseDto.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .name(u.getName())
                    .email(u.getEmail())
                    .role(primaryRole)
                    .roles(roleNames)
                    .departmentId(u.getDepartmentRestrictionId())
                    .department(deptName)
                    .designation(u.getDesignation())
                    .phoneNumber(u.getPhoneNumber())
                    .status(u.getStatus().name())
                    .assignedTasksCount(taskCountMap.getOrDefault(u.getId(), 0L))
                    .lastLoginAt(u.getLastLoginAt())
                    .createdAt(u.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    @Transactional
    public User createUser(UserCreateRequest request, UserPrincipal currentUser) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered: " + request.getEmail());
        }

        Set<Role> roles = new HashSet<>();
        if (request.getRoles() != null) {
            for (String roleName : request.getRoles()) {
                String normalized = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                roleRepository.findByRoleName(normalized).ifPresent(roles::add);
            }
        }
        if (roles.isEmpty()) {
            roleRepository.findByRoleName("ROLE_EMPLOYEE").ifPresent(roles::add);
        }

        User user = User.builder()
                .username(request.getUsername().trim().toLowerCase())
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .departmentRestrictionId(request.getDepartmentId())
                .phoneNumber(request.getPhoneNumber())
                .status(request.getStatus() != null ? request.getStatus() : User.UserStatus.ACTIVE)
                .roles(roles)
                .build();

        User saved = userRepository.save(user);

        // Record in Audit Log
        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_CREATED")
                .entityType("USER")
                .entityId(String.valueOf(saved.getId()))
                .newValue("{\"username\":\"" + saved.getUsername() + "\",\"roles\":\"" + request.getRoles() + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return saved;
    }

    @Transactional
    public User updateUser(Long id, UserUpdateRequest request, UserPrincipal currentUser) {
        User user = getUserById(id);

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already taken: " + request.getEmail());
        }

        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getDepartmentId() != null) user.setDepartmentRestrictionId(request.getDepartmentId());
        if (request.getStatus() != null) user.setStatus(request.getStatus());

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            for (String roleName : request.getRoles()) {
                String normalized = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                roleRepository.findByRoleName(normalized).ifPresent(roles::add);
            }
            if (!roles.isEmpty()) {
                user.setRoles(roles);
            }
        }

        User updated = userRepository.save(user);

        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_UPDATED")
                .entityType("USER")
                .entityId(String.valueOf(updated.getId()))
                .newValue("{\"name\":\"" + updated.getName() + "\",\"status\":\"" + updated.getStatus() + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return updated;
    }

    @Transactional
    public User updateUserStatus(Long id, User.UserStatus status, UserPrincipal currentUser) {
        User user = getUserById(id);
        User.UserStatus oldStatus = user.getStatus();
        user.setStatus(status);
        User updated = userRepository.save(user);

        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_STATUS_CHANGED")
                .entityType("USER")
                .entityId(String.valueOf(updated.getId()))
                .oldValue("{\"status\":\"" + oldStatus + "\"}")
                .newValue("{\"status\":\"" + status + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        return updated;
    }

    /**
     * Stage 1 – Deactivate User
     * Changes an ACTIVE user's status to INACTIVE.
     * Prevents future login access and invalidates active session/tokens.
     * Preserves historical records intact.
     */
    @Transactional
    public User deactivateUser(Long id, UserPrincipal currentUser) {
        User user = getUserById(id);
        if ("itadmin".equalsIgnoreCase(user.getUsername()) || id.equals(1L)) {
            throw new BadRequestException("Protected root administrator account 'itadmin' cannot be deactivated.");
        }
        if (currentUser != null && currentUser.getId().equals(id)) {
            throw new BadRequestException("You cannot deactivate your own logged-in administrator account.");
        }
        if (user.getStatus() == User.UserStatus.INACTIVE) {
            throw new BadRequestException("User '" + user.getName() + "' is already inactive.");
        }

        user.setStatus(User.UserStatus.INACTIVE);
        User saved = userRepository.save(user);

        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_DEACTIVATED")
                .entityType("USER")
                .entityId(String.valueOf(saved.getId()))
                .oldValue("{\"name\":\"" + user.getName() + "\",\"email\":\"" + user.getEmail() + "\",\"status\":\"ACTIVE\"}")
                .newValue("{\"status\":\"INACTIVE\",\"note\":\"Deactivated by administrator\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        log.info("Stage 1 complete: User id={} ({}) deactivated successfully", saved.getId(), saved.getUsername());
        return saved;
    }

    /**
     * Stage 2 – Permanent Database Deletion
     * Permanently deletes an already INACTIVE user from MySQL.
     * Rejects deletion if the user is still ACTIVE (independent backend enforcement).
     * Reassigns foreign key references safely to prevent orphan violations while preserving business records.
     */
    @Transactional
    public void deleteUser(Long id, UserPrincipal currentUser) {
        User user = getUserById(id);
        if ("itadmin".equalsIgnoreCase(user.getUsername()) || id.equals(1L)) {
            throw new BadRequestException("Protected root administrator account 'itadmin' cannot be deleted.");
        }
        if (currentUser != null && currentUser.getId().equals(id)) {
            throw new BadRequestException("You cannot delete your own logged-in administrator account.");
        }

        // Two-step rule enforcement: user must be INACTIVE first
        if (user.getStatus() == User.UserStatus.ACTIVE) {
            throw new BadRequestException("User '" + user.getName() + "' is currently ACTIVE. To prevent accidental data loss, please deactivate the user first before permanent deletion.");
        }

        Long adminId = (currentUser != null && currentUser.getId() != null) ? currentUser.getId() : 1L;

        // Clean up / reassign foreign key relationships safely to preserve historical HRMS records
        cleanupUserForeignKeys(user.getId(), adminId);

        // Permanently remove from MySQL
        userRepository.delete(user);
        userRepository.flush();

        AuditLog auditLog = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_PERMANENTLY_DELETED")
                .entityType("USER")
                .entityId(String.valueOf(id))
                .oldValue("{\"name\":\"" + user.getName() + "\",\"email\":\"" + user.getEmail() + "\",\"status\":\"INACTIVE\"}")
                .newValue("{\"action\":\"PERMANENT_DATABASE_DELETION\",\"status\":\"PURGED\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(auditLog);

        log.info("Stage 2 complete: User id={} ({}) permanently deleted from database", id, user.getUsername());
    }

    /**
     * Bulk Deletion
     * For each user:
     * - If ACTIVE: deactivates (Stage 1).
     * - If already INACTIVE: permanently deletes from MySQL (Stage 2).
     */
    @Transactional
    public int bulkDeleteUsers(List<Long> ids, UserPrincipal currentUser) {
        if (ids == null || ids.isEmpty()) return 0;
        int count = 0;
        Long adminId = (currentUser != null && currentUser.getId() != null) ? currentUser.getId() : 1L;

        for (Long id : ids) {
            if (id == null) continue;
            if (currentUser != null && currentUser.getId().equals(id)) continue;
            Optional<User> opt = userRepository.findById(id);
            if (opt.isEmpty()) continue;
            User u = opt.get();
            if ("itadmin".equalsIgnoreCase(u.getUsername()) || u.getId().equals(1L)) continue;

            if (u.getStatus() == User.UserStatus.ACTIVE) {
                // Stage 1 for active user in bulk
                u.setStatus(User.UserStatus.INACTIVE);
                userRepository.save(u);
                count++;

                auditLogRepository.save(AuditLog.builder()
                        .actorId(currentUser != null ? currentUser.getId() : null)
                        .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                        .action("USER_DEACTIVATED")
                        .entityType("USER")
                        .entityId(String.valueOf(u.getId()))
                        .newValue("{\"status\":\"INACTIVE\",\"reason\":\"Bulk deactivation\"}")
                        .ipAddress("127.0.0.1")
                        .build());
            } else {
                // Stage 2 for already inactive user in bulk
                cleanupUserForeignKeys(u.getId(), adminId);
                userRepository.delete(u);
                userRepository.flush();
                count++;

                auditLogRepository.save(AuditLog.builder()
                        .actorId(currentUser != null ? currentUser.getId() : null)
                        .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                        .action("USER_PERMANENTLY_DELETED")
                        .entityType("USER")
                        .entityId(String.valueOf(u.getId()))
                        .newValue("{\"action\":\"PERMANENT_DATABASE_DELETION\",\"reason\":\"Bulk permanent deletion\"}")
                        .ipAddress("127.0.0.1")
                        .build());
            }
        }
        return count;
    }

    /**
     * Reassigns foreign key references safely to preserve historical HRMS records
     * (interviews, requisitions, audit logs, employee documents, approvals)
     * before permanently deleting the user record.
     */
    private void cleanupUserForeignKeys(Long userId, Long adminId) {
        try {
            // 1. recruitment_tasks (assigned_user_id is NOT NULL, assigned_by_user_id nullable)
            entityManager.createNativeQuery("UPDATE recruitment_tasks SET assigned_user_id = :adminId WHERE assigned_user_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();
            entityManager.createNativeQuery("UPDATE recruitment_tasks SET assigned_by_user_id = :adminId WHERE assigned_by_user_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 2. interviews (interviewer_id is NOT NULL)
            entityManager.createNativeQuery("UPDATE interviews SET interviewer_id = :adminId WHERE interviewer_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 3. requisitions (created_by is NOT NULL, assigned_recruiter_id nullable)
            entityManager.createNativeQuery("UPDATE requisitions SET created_by = :adminId WHERE created_by = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();
            entityManager.createNativeQuery("UPDATE requisitions SET assigned_recruiter_id = :adminId WHERE assigned_recruiter_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 4. requisition_approvals (approver_id is NOT NULL)
            entityManager.createNativeQuery("UPDATE requisition_approvals SET approver_id = :adminId WHERE approver_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 5. requisition_history (changed_by is NOT NULL)
            entityManager.createNativeQuery("UPDATE requisition_history SET changed_by = :adminId WHERE changed_by = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 6. employee_documents (uploaded_by is NOT NULL)
            entityManager.createNativeQuery("UPDATE employee_documents SET uploaded_by = :adminId WHERE uploaded_by = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 7. departments (head_user_id nullable)
            entityManager.createNativeQuery("UPDATE departments SET head_user_id = NULL WHERE head_user_id = :userId")
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 8. approvals (requested_by_id, assigned_approver_id, decision_by_id)
            entityManager.createNativeQuery("UPDATE approvals SET requested_by_id = :adminId WHERE requested_by_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();
            entityManager.createNativeQuery("UPDATE approvals SET assigned_approver_id = :adminId WHERE assigned_approver_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();
            entityManager.createNativeQuery("UPDATE approvals SET decision_by_id = :adminId WHERE decision_by_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 9. offers (created_by)
            entityManager.createNativeQuery("UPDATE offers SET created_by = :adminId WHERE created_by = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 10. employee_status_history (changed_by_user_id)
            entityManager.createNativeQuery("UPDATE employee_status_history SET changed_by_user_id = :adminId WHERE changed_by_user_id = :userId")
                    .setParameter("adminId", adminId)
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 11. notifications (personal notifications for this user)
            entityManager.createNativeQuery("DELETE FROM notifications WHERE user_id = :userId")
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 12. approval_comments
            entityManager.createNativeQuery("DELETE FROM approval_comments WHERE user_id = :userId")
                    .setParameter("userId", userId)
                    .executeUpdate();

            // 13. user_roles join table
            entityManager.createNativeQuery("DELETE FROM user_roles WHERE user_id = :userId")
                    .setParameter("userId", userId)
                    .executeUpdate();

            log.info("Foreign key references for user id={} successfully sanitized", userId);
        } catch (Exception ex) {
            log.error("Failed to clean up foreign keys for user {}: {}", userId, ex.getMessage(), ex);
            throw new BadRequestException("Unable to safely delete user due to database constraints: " + ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }
}
