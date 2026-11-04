package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalCommentDto {
    private Long id;
    private Long userId;
    private String userName;
    private String userRole;
    private String comment;
    private LocalDateTime createdAt;
}
