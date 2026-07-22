package com.smartcampus.erp.application.course.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AssignmentResponse {
    private UUID   id;
    private String academicYear;
    private boolean active;

    // Faculty
    private UUID   facultyId;
    private String facultyName;
    private String facultyEmployeeId;
    private String facultyDesignation;

    // Subject
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private String subjectType;

    // Section → Semester → Program → Department
    private UUID   sectionId;
    private String sectionName;
    private String semesterName;
    private String programName;
    private String departmentName;

    private LocalDateTime createdAt;
}