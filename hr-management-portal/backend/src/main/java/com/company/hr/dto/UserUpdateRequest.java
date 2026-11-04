package com.company.hr.dto;

import com.company.hr.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    @NotBlank(message = "Full name is mandatory")
    private String name;

    @NotBlank(message = "Email is mandatory")
    @Email(message = "Valid email is required")
    private String email;

    private Long departmentId;

    private String phoneNumber;

    private List<String> roles;

    private User.UserStatus status;
}
