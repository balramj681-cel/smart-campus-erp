package com.smartcampus.erp.application.feedback.dto;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateFeedbackRequest {

    @NotNull
    private UUID assignmentId;

    @Min(1) @Max(5) private int teachingQuality;
    @Min(1) @Max(5) private int syllabusCoverage;
    @Min(1) @Max(5) private int communicationSkills;
    @Min(1) @Max(5) private int punctuality;

    private String comments;
}