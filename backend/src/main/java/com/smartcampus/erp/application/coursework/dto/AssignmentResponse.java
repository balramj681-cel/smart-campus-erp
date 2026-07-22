package com.smartcampus.erp.application.coursework.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AssignmentResponse {
    private UUID   id;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private Integer maxMarks;
    private String academicYear;
    private boolean active;
    private boolean pastDue;

    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;

    private UUID   sectionId;
    private String sectionName;

    private UUID   facultyId;
    private String facultyName;

    private long submissionCount;

    private boolean hasAttachment;
    private String  attachmentFileName;

    private String mySubmissionStatus;
    private boolean mySubmissionGraded;

    private LocalDateTime createdAt;
}