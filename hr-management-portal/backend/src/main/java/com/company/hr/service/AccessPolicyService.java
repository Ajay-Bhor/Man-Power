package com.company.hr.service;

import com.company.hr.entity.AccessPolicy;
import com.company.hr.entity.AuditLog;
import com.company.hr.entity.User;
import com.company.hr.exception.ResourceNotFoundException;
import com.company.hr.repository.AccessPolicyRepository;
import com.company.hr.repository.AuditLogRepository;
import com.company.hr.repository.UserRepository;
import com.company.hr.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccessPolicyService {

    private final AccessPolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<AccessPolicy> getAllPolicies() {
        return policyRepository.findAll();
    }

    @Transactional(readOnly = true)
    public boolean isPolicyEnabled(String policyKey) {
        return policyRepository.findByPolicyKey(policyKey)
                .map(p -> "true".equalsIgnoreCase(p.getPolicyValue()) || "enabled".equalsIgnoreCase(p.getPolicyValue()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public String getPolicyValue(String policyKey, String defaultValue) {
        return policyRepository.findByPolicyKey(policyKey)
                .map(AccessPolicy::getPolicyValue)
                .orElse(defaultValue);
    }

    @Transactional
    public AccessPolicy updatePolicy(String policyKey, String policyValue, UserPrincipal currentUser) {
        AccessPolicy policy = policyRepository.findByPolicyKey(policyKey)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found with key: " + policyKey));

        String oldValue = policy.getPolicyValue();
        policy.setPolicyValue(policyValue);

        if (currentUser != null && currentUser.getId() != null) {
            userRepository.findById(currentUser.getId()).ifPresent(policy::setUpdatedBy);
        }

        AccessPolicy saved = policyRepository.save(policy);

        // Record in Audit Log
        AuditLog log = AuditLog.builder()
                .actorId(currentUser != null ? currentUser.getId() : null)
                .actorName(currentUser != null ? currentUser.getName() : "System")
                .action("POLICY_UPDATED")
                .entityType("ACCESS_POLICY")
                .entityId(policyKey)
                .oldValue("{\"value\": \"" + oldValue + "\"}")
                .newValue("{\"value\": \"" + policyValue + "\"}")
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(log);

        return saved;
    }

    public boolean canItAdminAccessCandidates() {
        return isPolicyEnabled("it_admin_candidate_access");
    }

    public boolean canItAdminAccessResumes() {
        return isPolicyEnabled("it_admin_resume_access");
    }

    public boolean canItAdminAccessFeedback() {
        return isPolicyEnabled("it_admin_feedback_access");
    }

    public boolean canUserAssignRecruiters(UserPrincipal user) {
        if (user == null) return false;
        String allowedRoles = getPolicyValue("can_assign_recruiters", "ROLE_HR_ADMIN");
        return hasAnyAllowedRole(user, allowedRoles);
    }

    public boolean canUserAssignInterviewers(UserPrincipal user) {
        if (user == null) return false;
        String allowedRoles = getPolicyValue("can_assign_interviewers", "ROLE_HR_ADMIN");
        return hasAnyAllowedRole(user, allowedRoles);
    }

    public boolean canUserAssignApprovers(UserPrincipal user) {
        if (user == null) return false;
        String allowedRoles = getPolicyValue("can_assign_approvers", "ROLE_HR_ADMIN,ROLE_DEPT_HEAD");
        return hasAnyAllowedRole(user, allowedRoles);
    }

    private boolean hasAnyAllowedRole(UserPrincipal user, String commaSeparatedRoles) {
        List<String> userRoles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return Arrays.stream(commaSeparatedRoles.split(","))
                .map(String::trim)
                .anyMatch(userRoles::contains);
    }
}
