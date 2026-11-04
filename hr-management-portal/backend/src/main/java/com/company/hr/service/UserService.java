package com.company.hr.service;

import com.company.hr.dto.UserCreateRequest;
import com.company.hr.dto.UserUpdateRequest;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.Role;
import com.company.hr.entity.User;
import com.company.hr.exception.BadRequestException;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.RoleRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import com.company.hr.dto.UserResponseDto;
import com.company.hr.repository.RecruitmentTaskRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;
    private final RecruitmentTaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
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

        return users.stream().map(u -> {
            List<String> roleNames = u.getRoles().stream()
                    .map(Role::getRoleName)
                    .collect(Collectors.toList());
            String primaryRole = roleNames.isEmpty() ? "ROLE_EMPLOYEE" : roleNames.get(0);
            return UserResponseDto.builder()
                    .id(u.getId())
                    .username(u.getUsername())
                    .name(u.getName())
                    .email(u.getEmail())
                    .role(primaryRole)
                    .roles(roleNames)
                    .department(u.getDepartmentRestrictionId() != null ? "Department #" + u.getDepartmentRestrictionId() : "Human Resources")
                    .designation(u.getDesignation())
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
        AuditLog log = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_CREATED")
                .entityType("USER")
                .entityId(String.valueOf(saved.getId()))
                .newValue("{\"username\":\"" + saved.getUsername() + "\",\"roles\":\"" + request.getRoles() + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(log);

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

        AuditLog log = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_UPDATED")
                .entityType("USER")
                .entityId(String.valueOf(updated.getId()))
                .newValue("{\"name\":\"" + updated.getName() + "\",\"status\":\"" + updated.getStatus() + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(log);

        return updated;
    }

    @Transactional
    public User updateUserStatus(Long id, User.UserStatus status, UserPrincipal currentUser) {
        User user = getUserById(id);
        User.UserStatus oldStatus = user.getStatus();
        user.setStatus(status);
        User updated = userRepository.save(user);

        AuditLog log = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "IT Admin")
                .action("USER_STATUS_CHANGED")
                .entityType("USER")
                .entityId(String.valueOf(updated.getId()))
                .oldValue("{\"status\":\"" + oldStatus + "\"}")
                .newValue("{\"status\":\"" + status + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(log);

        return updated;
    }

    @Transactional(readOnly = true)
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }
}
