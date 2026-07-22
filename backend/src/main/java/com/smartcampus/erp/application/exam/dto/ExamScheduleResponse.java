package com.smartcampus.erp.application.exam.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.domain.shared.enums.ExamType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ExamScheduleResponse {
    private UUID       id;
    private ExamType   examType;
    private String     examTypeDisplay;
    private LocalDate  examDate;
    private LocalTime  startTime;
    private LocalTime  endTime;
    private String     venue;
    private String     academicYear;
    private ExamStatus status;
    private String     statusDisplay;
    private String     instructions;

    // Subject
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private int    creditHours;

    // Section → Semester → Program → Department
    private UUID   sectionId;
    private String sectionName;
    private String semesterName;
    private String programName;
    private String departmentName;

    private LocalDateTime createdAt;
}