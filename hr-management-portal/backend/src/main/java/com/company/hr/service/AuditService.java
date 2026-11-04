package com.company.hr.service;

import com.company.hr.entity.AuditLog;
import com.company.hr.entity.BackupHistory;
import com.company.hr.entity.User;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.BackupHistoryRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logAction(Long actorId, String actorName, String action, String entityType, String entityId, String oldValue, String newValue, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .actorId(actorId)
                .actorName(actorName)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getScopedAuditLogs(UserPrincipal currentUser, Pageable pageable) {
        if (currentUser == null) {
            return Page.empty(pageable);
        }
        boolean isITAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_IT_ADMIN"));
        if (isITAdmin) {
            return auditLogRepository.findAll(pageable);
        }
        boolean isHRAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_HR_ADMIN"));
        if (isHRAdmin) {
            List<String> hrEntityTypes = List.of(
                    "RECRUITMENT_TASK", "CANDIDATE", "INTERVIEW", "OFFER", "EMPLOYEE", "REQUISITION", "APPROVAL"
            );
            return auditLogRepository.findByEntityTypeIn(hrEntityTypes, pageable);
        }
        throw new org.springframework.security.access.AccessDeniedException("You do not have permission to view audit logs");
    }
}
