package com.smartcampus.erp.application.feedback.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

/** Aggregated summary — ek assignment (ya ek faculty overall) ke liye. */
@Getter @Builder
public class FeedbackSummaryResponse {
    private UUID   assignmentId;
    private String subjectCode;
    private String subjectName;
    private String sectionName;
    private String facultyName;
    private double averageRating;
    private long   totalResponses;
}