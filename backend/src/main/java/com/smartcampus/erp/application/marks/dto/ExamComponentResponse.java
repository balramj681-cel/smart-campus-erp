package com.smartcampus.erp.application.marks.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.ExamType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ExamComponentResponse {
    private UUID      id;
    private ExamType  examType;
    private String    examTypeDisplay;
    private int       maxMarks;
    private double    weightage;
    private String    academicYear;
    private LocalDate scheduledDate;
    private boolean   published;
    private int       marksEntered;
    private int       totalStudents;

    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private UUID   sectionId;
    private String sectionName;
    private String facultyName;

    private LocalDateTime createdAt;
}