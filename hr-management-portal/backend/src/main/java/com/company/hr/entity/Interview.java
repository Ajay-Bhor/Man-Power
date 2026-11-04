package com.company.hr.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "interviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "requisition"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "assignedRecruiter", "replacementForEmployee"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requisition_id", nullable = false)
    private Requisition requisition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InterviewRound round;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "authorities"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", nullable = false)
    private User interviewer;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 45;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 30)
    @Builder.Default
    private InterviewMode mode = InterviewMode.ONLINE;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "meeting_location", length = 200)
    private String meetingLocation;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InterviewStatus status = InterviewStatus.SCHEDULED;

    @OneToOne(mappedBy = "interview", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("interview")
    private InterviewFeedback feedback;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum InterviewMode {
        ONLINE,
        IN_PERSON,
        TELEPHONIC;

        @com.fasterxml.jackson.annotation.JsonCreator
        public static InterviewMode fromString(String value) {
            if (value == null || value.isBlank()) return ONLINE;
            String upper = value.trim().toUpperCase();
            if (upper.contains("PERSON") || upper.contains("PLANT") || upper.contains("OFFICE") || upper.contains("ONSITE")) {
                return IN_PERSON;
            }
            if (upper.contains("TELE") || upper.contains("PHONE")) {
                return TELEPHONIC;
            }
            return ONLINE;
        }
    }

    public enum InterviewRound {
        HR_SCREENING,
        TECHNICAL_R1,
        TECHNICAL_R2,
        MANAGERIAL,
        DIRECTOR_FINAL
    }

    public enum InterviewStatus {
        SCHEDULED,
        RESCHEDULED,
        COMPLETED,
        CANCELLED,
        NO_SHOW
    }
}
