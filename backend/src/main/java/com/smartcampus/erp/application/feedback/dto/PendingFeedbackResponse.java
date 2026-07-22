package com.smartcampus.erp.application.feedback.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

/** Ek row = ek subject jise student abhi tak rate nahi kar paya. */
@Getter @Builder
public class PendingFeedbackResponse {
    private UUID assignmentId;
    private String subjectCode;
    private String subjectName;
    private String facultyName;
    private String sectionName;
    private String academicYear;
}