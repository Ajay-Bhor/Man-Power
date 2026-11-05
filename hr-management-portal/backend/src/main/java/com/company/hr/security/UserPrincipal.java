package com.company.hr.security;

import com.company.hr.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
@Builder
public class UserPrincipal implements UserDetails {

    private Long id;
    private String username;
    private String name;
    private String email;

    @JsonIgnore
    private String password;

    private Long departmentRestrictionId;
    private String profileImageUrl;
    private String title;
    private Collection<? extends GrantedAuthority> authorities;
    private boolean enabled;

    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getRoleName()))
                .collect(Collectors.toList());

        String resolvedTitle = "HR Executive";
        if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_IT_ADMIN"))) {
            resolvedTitle = "IT Administrator";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_HR_ADMIN"))) {
            resolvedTitle = "Talent Acquisition Lead";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_HR_RECRUITER"))) {
            resolvedTitle = "Senior Recruiter";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_INTERVIEWER"))) {
            resolvedTitle = "Technical Lead / Interviewer";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_DEPT_HEAD"))) {
            resolvedTitle = "Department Head";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_APPROVING_MANAGER"))) {
            resolvedTitle = "Approving Manager";
        } else if (authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_SENIOR_MGMT"))) {
            resolvedTitle = "VP - Operations";
        }

        String avatar = user.getProfileImageUrl();
        if (avatar == null || avatar.isBlank()) {
            avatar = authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_DEPT_HEAD")) 
                    ? "/assets/images/man.jpg" 
                    : "/assets/images/woman.jpg";
        }

        return UserPrincipal.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .password(user.getPasswordHash())
                .departmentRestrictionId(user.getDepartmentRestrictionId())
                .profileImageUrl(avatar)
                .title(resolvedTitle)
                .authorities(authorities)
                .enabled(user.getStatus() == User.UserStatus.ACTIVE)
                .build();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
