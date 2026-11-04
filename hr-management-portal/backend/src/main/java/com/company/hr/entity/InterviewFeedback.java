package com.company.hr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("feedback")
    private Interview interview;

    @Column(name = "technical_rating", nullable = false)
    private Integer technicalRating;

    @Column(name = "communication_rating", nullable = false)
    private Integer communicationRating;

    @Column(name = "culture_fit_rating", nullable = false)
    private Integer cultureFitRating;

    @Column(name = "overall_rating", nullable = false, precision = 3, scale = 1)
    private BigDecimal overallRating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Recommendation recommendation;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    @Column(name = "detailed_comments", nullable = false, columnDefinition = "TEXT")
    private String detailedComments;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    public enum Recommendation {
        STRONG_HIRE,
        HIRE,
        HOLD,
        REJECT
    }
}
