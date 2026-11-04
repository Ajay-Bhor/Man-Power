package com.company.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizedDashboardResponse {
    private UserDto user;
    private DashboardMetricsDto metrics;
    private List<ActivityDto> recentActivities;
    private List<RequisitionItemDto> openRequisitions;
    private List<InterviewItemDto> upcomingInterviews;
    private List<TaskItemDto> tasks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String name;
        private String firstName;
        private String email;
        private String title;
        private String department;
        private String profileImageUrl;
        private List<String> roles;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardMetricsDto {
        private long activeRequisitions;
        private long assignedCandidates;
        private long interviewsThisWeek;
        private long pendingOffers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityDto {
        private String id;
        private String type; // candidate, interview, feedback, offer
        private String title;
        private String subtitle;
        private String timeAgo;
        private String iconColor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequisitionItemDto {
        private String id;
        private String jobTitle;
        private String department;
        private String location;
        private String status;
        private int candidateCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterviewItemDto {
        private String id;
        private String dateDay;
        private String dateMonth;
        private String candidateName;
        private String role;
        private String time;
        private String mode; // Online, Onsite
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskItemDto {
        private String id;
        private String title;
        private String dueDate;
        private boolean completed;
    }
}
