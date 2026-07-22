package com.smartcampus.erp.application.exam.dto;

import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class HallTicketResponse {
    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;
    private int    batch;
    private String programName;
    private String departmentName;
    private String semesterName;
    private String sectionName;
    private String academicYear;
    private String examTypeLabel;       // "Mid Term Examinations" etc.
    private String hallTicketNumber;   // HT/2024-25/CSE2024001
    private List<HallTicketExamEntry> exams;
}