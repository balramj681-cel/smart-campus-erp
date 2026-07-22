package com.smartcampus.erp.presentation.feedback;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.feedback.dto.CreateFeedbackRequest;
import com.smartcampus.erp.application.feedback.dto.FeedbackResponse;
import com.smartcampus.erp.application.feedback.dto.FeedbackSummaryResponse;
import com.smartcampus.erp.application.feedback.dto.PendingFeedbackResponse;
import com.smartcampus.erp.application.feedback.service.CourseFeedbackService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class CourseFeedbackController {

    private final CourseFeedbackService feedbackService;

    // ── Student ──────────────────────────────────────────────────────────

    @GetMapping("/pending")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<PendingFeedbackResponse>> getPending(
            Authentication auth,
            @RequestParam(required = false) String academicYear) {
        return ResponseEntity.ok(feedbackService.getPending(auth.getName(), academicYear));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<FeedbackResponse>> getMySubmitted(Authentication auth) {
        return ResponseEntity.ok(feedbackService.getMySubmitted(auth.getName()));
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<FeedbackResponse> submit(
            @Valid @RequestBody CreateFeedbackRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.submit(req, auth.getName()));
    }

    // ── Faculty ──────────────────────────────────────────────────────────

    @GetMapping("/my-summary")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<List<FeedbackSummaryResponse>> getMySummary(Authentication auth) {
        return ResponseEntity.ok(feedbackService.getMySummary(auth.getName()));
    }

    @GetMapping("/assignment/{assignmentId}")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<List<FeedbackResponse>> getForAssignment(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(feedbackService.getFeedbackForAssignment(assignmentId));
    }

    // ── Admin ────────────────────────────────────────────────────────────

    @GetMapping("/admin-overview")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<List<FeedbackSummaryResponse>> getAdminOverview() {
        return ResponseEntity.ok(feedbackService.getAdminOverview());
    }
}