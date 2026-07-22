package com.smartcampus.erp.application.attendance.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SubjectAttendanceSummary {
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private int    totalSessions;
    private int    attendedSessions;
    private int    absentSessions;
    private double percentage;
    private String  statusLabel;      // SAFE / AT_RISK / DETAINED
    private boolean eligibleForExam;  // true if >= 75%
}