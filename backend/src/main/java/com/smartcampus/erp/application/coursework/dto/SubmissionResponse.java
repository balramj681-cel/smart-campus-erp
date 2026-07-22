package com.smartcampus.erp.application.coursework.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.SubmissionStatus;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SubmissionResponse {
    private UUID id;

    private UUID   assignmentId;
    private String assignmentTitle;
    private Integer maxMarks;

    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;

    private String originalFileName;
    private long   fileSize;
    private String contentType;

    private SubmissionStatus status;
    private String statusDisplay;
    private String statusEmoji;
    private boolean late;

    private Integer marksObtained;
    private String  feedback;
    private LocalDateTime gradedAt;

    private LocalDateTime submittedAt;
}