package com.smartcampus.erp.application.marks.dto;

import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class StudentResultResponse {
    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;

    private List<SubjectResultDto> subjects;

    private double sgpa;             // Semester GPA
    private int    totalCredits;
    private int    totalCreditPoints;
    private String resultStatus;     // PASS / FAIL / INCOMPLETE
}