package com.smartcampus.erp.application.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AttendanceSessionResponse {
    private UUID   id;
    private String academicYear;
    private LocalDate sessionDate;
    private String remarks;
    private Integer periodNumber;

    // Subject
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;

    // Faculty
    private UUID   facultyId;
    private String facultyName;

    // Section
    private UUID   sectionId;
    private String sectionName;
    private String semesterName;
    private String programName;
    private String departmentName;

    // Stats
    private int totalStudents;
    private int presentCount;
    private int absentCount;
    private int lateCount;

    private List<AttendanceRecordResponse> records;
    private LocalDateTime createdAt;
}