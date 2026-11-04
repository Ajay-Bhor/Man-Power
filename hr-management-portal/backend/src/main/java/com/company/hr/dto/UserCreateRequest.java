package com.company.hr.dto;

import com.company.hr.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreateRequest {

    @NotBlank(message = "Username is mandatory")
    private String username;

    @NotBlank(message = "Full name is mandatory")
    private String name;

    @NotBlank(message = "Email is mandatory")
    @Email(message = "Valid email is required")
    private String email;

    @NotBlank(message = "Password is mandatory")
    private String password;

    private Long departmentId;

    private String phoneNumber;

    @NotEmpty(message = "At least one role must be assigned")
    private List<String> roles;

    @Builder.Default
    private User.UserStatus status = User.UserStatus.ACTIVE;
}
