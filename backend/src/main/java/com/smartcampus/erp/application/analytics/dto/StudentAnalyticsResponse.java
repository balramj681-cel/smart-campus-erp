package com.smartcampus.erp.application.analytics.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter @Builder
public class StudentAnalyticsResponse {

    // ── Profile ───────────────────────────────────────────────────────────────
    private String enrollmentNumber;
    private String programName;
    private String departmentName;
    private String semesterName;
    private String sectionName;
    private int    batch;

    // ── Attendance ────────────────────────────────────────────────────────────
    private double overallAttendancePercent;
    private String attendanceStatus;           // SAFE / AT_RISK / DETAINED
    private List<SubjectAttendance> subjectAttendance;

    // ── Result ────────────────────────────────────────────────────────────────
    private Double sgpa;
    private String resultStatus;

    // ── Fees ──────────────────────────────────────────────────────────────────
    private double totalFeesDue;
    private double totalFeesPaid;
    private int    pendingFeeRecords;

    // ── Upcoming exams ────────────────────────────────────────────────────────
    private List<UpcomingExam> upcomingExams;

    // ── Notices ───────────────────────────────────────────────────────────────
    private List<AdminAnalyticsResponse.RecentNotice> recentNotices;

    @Getter @Builder
    public static class SubjectAttendance {
        private String  subjectCode;
        private String  subjectName;
        private double  percentage;
        private int     attended;
        private int     total;
        private String  statusLabel;
        private boolean eligibleForExam;
    }

    @Getter @Builder
    public static class UpcomingExam {
        private String    subjectName;
        private String    subjectCode;
        private String    examTypeDisplay;
        private LocalDate examDate;
        private String    startTime;
        private String    venue;
        private String    statusDisplay;
    }
}