package com.smartcampus.erp.application.analytics.dto;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AdminAnalyticsResponse {

    // ── Core counts ───────────────────────────────────────────────────────────
    private long totalStudents;
    private long totalFaculty;
    private long totalDepartments;
    private long totalPrograms;
    private long totalSubjects;
    private long totalSections;
    private long activeStudents;
    private long activeFaculty;

    // ── Attendance ────────────────────────────────────────────────────────────
    private double todayAttendancePercent;
    private long   todaySessionsMarked;
    private List<TrendPoint> attendanceTrend;  // last 7 days

    // ── Fee ───────────────────────────────────────────────────────────────────
    private double totalFeesCollected;
    private double totalFeesPending;
    private long   paidStudents;
    private long   pendingStudents;
    private List<TrendPoint>     feeCollectionTrend;  // last 6 months
    private List<PieSlice>       feeStatusBreakdown;

    // ── Distributions ─────────────────────────────────────────────────────────
    private List<PieSlice>  studentsByDepartment;
    private List<BarPoint>  attendanceByDepartment;

    // ── Recent activity ───────────────────────────────────────────────────────
    private List<RecentNotice>  recentNotices;

    // ── Inner types ───────────────────────────────────────────────────────────
    @Getter @Builder
    public static class TrendPoint {
        private String label;   // "Mon", "Jan 24", etc.
        private double value;
    }

    @Getter @Builder
    public static class PieSlice {
        private String name;
        private long   value;
        private String color;
    }

    @Getter @Builder
    public static class BarPoint {
        private String name;
        private double attendance;
    }

    @Getter @Builder
    public static class RecentNotice {
        private String title;
        private String category;
        private String postedBy;
        private String createdAt;
    }
}