package com.smartcampus.erp.presentation.analytics;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.analytics.dto.AdminAnalyticsResponse;
import com.smartcampus.erp.application.analytics.dto.FacultyAnalyticsResponse;
import com.smartcampus.erp.application.analytics.dto.StudentAnalyticsResponse;
import com.smartcampus.erp.application.analytics.service.AnalyticsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<AdminAnalyticsResponse> getAdminAnalytics(
            @RequestParam String academicYear) {
        return ResponseEntity.ok(analyticsService.getAdminAnalytics(academicYear));
    }

    @GetMapping("/student")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentAnalyticsResponse> getStudentAnalytics(
            Authentication auth,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(analyticsService.getStudentAnalytics(auth.getName(), academicYear));
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<FacultyAnalyticsResponse> getFacultyAnalytics(
            Authentication auth,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(analyticsService.getFacultyAnalytics(auth.getName(), academicYear));
    }
}