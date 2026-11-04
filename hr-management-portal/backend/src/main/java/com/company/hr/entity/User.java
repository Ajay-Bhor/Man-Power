package com.company.hr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @com.fasterxml.jackson.annotation.JsonProperty("designation")
    public String getDesignation() {
        if (roles == null || roles.isEmpty()) return "Interviewer";
        for (Role r : roles) {
            String rn = r.getRoleName();
            if ("ROLE_INTERVIEWER".equals(rn)) return "Technical Lead / Interviewer";
            if ("ROLE_DEPT_HEAD".equals(rn)) return "Department Head";
            if ("ROLE_APPROVING_MANAGER".equals(rn)) return "Approving Manager";
            if ("ROLE_HR_ADMIN".equals(rn)) return "Talent Acquisition Lead";
            if ("ROLE_HR_RECRUITER".equals(rn)) return "Senior Technical Recruiter";
            if ("ROLE_HRBP".equals(rn)) return "HR Business Partner";
            if ("ROLE_SENIOR_MGMT".equals(rn)) return "VP - Operations";
            if ("ROLE_IT_ADMIN".equals(rn)) return "IT Administrator";
        }
        return "Panel Member";
    }

    @com.fasterxml.jackson.annotation.JsonProperty("title")
    public String getTitle() {
        return getDesignation();
    }

    @Column(name = "department_restriction_id")
    private Long departmentRestrictionId;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED,
        PENDING_VERIFICATION
    }
}
