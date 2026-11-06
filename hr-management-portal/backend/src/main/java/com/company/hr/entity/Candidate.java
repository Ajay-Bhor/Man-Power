package com.company.hr.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidate_code", nullable = false, unique = true, length = 50)
    private String candidateCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 30)
    private String mobile;

    @Column(name = "experience_years", nullable = false, precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal experienceYears = BigDecimal.ZERO;

    @Column(name = "current_employer", length = 150)
    private String currentEmployer;

    @Column(name = "current_designation", length = 150)
    private String currentDesignation;

    @Column(name = "current_ctc", precision = 12, scale = 2)
    private BigDecimal currentCtc;

    @Column(name = "expected_ctc", precision = 12, scale = 2)
    private BigDecimal expectedCtc;

    @Column(name = "notice_period_days")
    @Builder.Default
    private Integer noticePeriodDays = 30;

    @Column(name = "primary_skills", columnDefinition = "TEXT")
    private String primarySkills;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CandidateSource source = CandidateSource.LINKEDIN;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "assignedRecruiter", "replacementForEmployee"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id", nullable = true)
    @NotFound(action = NotFoundAction.IGNORE)
    private Requisition requisition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 35)
    @Builder.Default
    private CandidateStatus status = CandidateStatus.APPLIED;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    @JsonProperty("jobTitle")
    public String getJobTitle() {
        try { return (requisition != null && requisition.getJobTitle() != null) ? requisition.getJobTitle() : (currentDesignation != null ? currentDesignation : "Specialist"); } catch (Exception e) { return currentDesignation != null ? currentDesignation : "Specialist"; }
    }

    @Transient
    @JsonProperty("departmentName")
    public String getDepartmentName() {
        try { return (requisition != null && requisition.getDepartment() != null) ? requisition.getDepartment().getDepartmentName() : "General"; } catch (Exception e) { return "General"; }
    }

    @Transient
    @JsonProperty("location")
    public String getLocation() {
        if (name != null) {
            String lower = name.toLowerCase();
            if (lower.contains("sneha")) return "Shirdi";
            if (lower.contains("neha") || lower.contains("riya")) return "Mumbai";
            if (lower.contains("vikram")) return "Rahuri";
            if (lower.contains("soham")) return "Plant - Shirdi";
            if (lower.contains("amit") || lower.contains("rahul") || lower.contains("pooja")) return "Pune";
        }
        return "Pune";
    }

    @Transient
    @JsonProperty("appliedDate")
    public String getAppliedDate() {
        if (createdAt != null) {
            return createdAt.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy"));
        }
        return "12 Oct 2026";
    }

    @Transient
    @JsonProperty("currentStage")
    public String getCurrentStage() {
        if (status == null) return "Application Received";
        return switch (status) {
            case APPLIED -> "Application Received";
            case SCREENING -> "Screening";
            case SHORTLISTED -> "HR Round";
            case INTERVIEW_SCHEDULED, INTERVIEW_IN_PROGRESS -> "Technical Round";
            case OFFER_EXTENDED, OFFER_ACCEPTED -> "Offer Released";
            case JOINED -> "Joined";
            case REJECTED, WITHDRAWN -> "Not Selected";
        };
    }

    @Transient
    @JsonProperty("displayStatus")
    public String getDisplayStatus() {
        if (status == null) return "New";
        return switch (status) {
            case APPLIED -> "New";
            case SCREENING, SHORTLISTED -> "In Progress";
            case INTERVIEW_SCHEDULED, INTERVIEW_IN_PROGRESS -> "Interview";
            case OFFER_EXTENDED, OFFER_ACCEPTED -> "Offer";
            case JOINED -> "Joined";
            case REJECTED, WITHDRAWN -> "Rejected";
        };
    }

    @Transient
    @JsonProperty("avatar")
    public String getAvatar() {
        if (name != null) {
            String lower = name.toLowerCase();
            if (lower.contains("amit")) return "/assets/images/cand_amit.jpg";
            if (lower.contains("neha")) return "/assets/images/cand_neha.jpg";
            if (lower.contains("rahul")) return "/assets/images/cand_rahul.jpg";
            if (lower.contains("sneha")) return "/assets/images/cand_sneha.jpg";
            if (lower.contains("vikram")) return "/assets/images/cand_vikram.jpg";
            if (lower.contains("pooja")) return "/assets/images/cand_pooja.jpg";
            if (lower.contains("soham")) return "/assets/images/cand_soham.jpg";
            if (lower.contains("riya")) return "/assets/images/cand_riya.jpg";
        }
        return "/assets/images/man.jpg";
    }

    public enum CandidateSource {
        LINKEDIN,
        NAUKRI,
        REFERRAL,
        COMPANY_CAREERS,
        CAMPUS,
        HEADHUNTER
    }

    public enum CandidateStatus {
        APPLIED,
        SCREENING,
        SHORTLISTED,
        INTERVIEW_SCHEDULED,
        INTERVIEW_IN_PROGRESS,
        OFFER_EXTENDED,
        OFFER_ACCEPTED,
        JOINED,
        REJECTED,
        WITHDRAWN
    }
}
