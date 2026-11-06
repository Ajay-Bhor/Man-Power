package com.company.hr.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String username;
    private String name;
    private String email;
    private String role;
    private List<String> roles;
    private Long departmentId;
    private String department;
    private String designation;
    private String phoneNumber;
    private String profileImageUrl;
    private String status;
    private long assignedTasksCount;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    @JsonProperty("title")
    public String getTitle() {
        return designation != null ? designation : "HR Professional";
    }

    @JsonProperty("avatar")
    public String getAvatar() {
        if (profileImageUrl != null && !profileImageUrl.isBlank()) {
            return profileImageUrl;
        }
        boolean isMale = (roles != null && roles.contains("ROLE_DEPT_HEAD"))
                || (roles != null && roles.contains("ROLE_INTERVIEWER"))
                || (name != null && (name.toLowerCase().contains("vikram") || name.toLowerCase().contains("arjun") || name.toLowerCase().contains("amitav") || name.toLowerCase().contains("rajesh")));
        return isMale ? "/assets/images/man.jpg" : "/assets/images/woman.jpg";
    }
}
