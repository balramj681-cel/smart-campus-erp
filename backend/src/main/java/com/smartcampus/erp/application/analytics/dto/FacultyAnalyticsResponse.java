package com.smartcampus.erp.application.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter @Builder
public class FacultyAnalyticsResponse {

    // ── Profile ───────────────────────────────────────────────────────────────
    private String employeeId;
    private String departmentName;
    private String designation;

    // ── Teaching load ─────────────────────────────────────────────────────────
    private int totalSubjectsAssigned;
    private int totalPeriodsPerWeek;
    private int totalStudentsUnder;

    // ── Today ─────────────────────────────────────────────────────────────────
    private List<TodayClass>        todayClasses;
    private int                     todaySessionsMarked;

    // ── Attendance stats ──────────────────────────────────────────────────────
    private List<SubjectAttendanceStat> subjectAttendanceStats;
    private List<RecentSession>         recentSessions;

    @Getter @Builder
    public static class TodayClass {
        private String subjectName;
        private String subjectCode;
        private String sectionName;
        private String semesterName;
        private int    periodNumber;
        private String startTime;
        private String endTime;
        private String roomNumber;
        private boolean attendanceMarked;
    }

    @Getter @Builder
    public static class SubjectAttendanceStat {
        private String subjectName;
        private String subjectCode;
        private String sectionName;
        private int    totalSessions;
        private double avgAttendancePercent;
    }

    @Getter @Builder
    public static class RecentSession {
        private LocalDate sessionDate;
        private String    subjectName;
        private String    sectionName;
        private int       presentCount;
        private int       absentCount;
        private double    percentage;
    }
}