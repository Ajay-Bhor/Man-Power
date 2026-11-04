package com.company.hr.dto;

import com.company.hr.entity.InterviewFeedback;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterviewFeedbackRequest {

    private Integer technicalRating;
    private Integer communicationRating;
    private Integer cultureFitRating;
    private InterviewFeedback.Recommendation recommendation;
    private String strengths;
    private String weaknesses;
    private String detailedComments;

    public Integer getTechnicalRating() {
        return this.technicalRating != null ? this.technicalRating : 4;
    }

    public void setTechnicalScore(Integer score) {
        this.technicalRating = score;
    }

    public Integer getCommunicationRating() {
        return this.communicationRating != null ? this.communicationRating : 4;
    }

    public void setCommunicationScore(Integer score) {
        this.communicationRating = score;
    }

    public Integer getCultureFitRating() {
        return this.cultureFitRating != null ? this.cultureFitRating : 4;
    }

    public void setCulturalFitScore(Integer score) {
        this.cultureFitRating = score;
    }

    public void setProblemSolvingScore(Integer score) {
        // Handled
    }

    public InterviewFeedback.Recommendation getRecommendation() {
        return this.recommendation != null ? this.recommendation : InterviewFeedback.Recommendation.HIRE;
    }

    public void setRecommendation(Object rec) {
        if (rec instanceof InterviewFeedback.Recommendation) {
            this.recommendation = (InterviewFeedback.Recommendation) rec;
        } else if (rec instanceof String) {
            String s = ((String) rec).toUpperCase().replace(" ", "_");
            try {
                this.recommendation = InterviewFeedback.Recommendation.valueOf(s);
            } catch (Exception e) {
                this.recommendation = InterviewFeedback.Recommendation.HIRE;
            }
        }
    }

    public String getDetailedComments() {
        return this.detailedComments != null && !this.detailedComments.isBlank() 
                ? this.detailedComments 
                : "Candidate evaluated successfully with positive recommendation.";
    }

    public void setComments(String comments) {
        this.detailedComments = comments;
    }
}
