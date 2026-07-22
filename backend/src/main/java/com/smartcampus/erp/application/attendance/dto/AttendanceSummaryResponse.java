package com.smartcampus.erp.application.attendance.dto;

import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AttendanceSummaryResponse {
    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;
    private double overallPercentage;
    private String overallStatus;
    private List<SubjectAttendanceSummary> subjects;
}