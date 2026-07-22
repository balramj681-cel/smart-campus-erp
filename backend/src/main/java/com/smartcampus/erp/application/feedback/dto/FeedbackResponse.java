package com.smartcampus.erp.application.feedback.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class FeedbackResponse {
    private UUID id;
    private UUID assignmentId;
    private String subjectName;
    private String subjectCode;
    private String sectionName;

    private int teachingQuality;
    private int syllabusCoverage;
    private int communicationSkills;
    private int punctuality;
    private double overallRating;

    private String comments;
    private LocalDateTime createdAt;
}