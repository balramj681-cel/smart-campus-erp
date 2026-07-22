package com.smartcampus.erp.presentation.marks;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.marks.dto.CreateExamComponentRequest;
import com.smartcampus.erp.application.marks.dto.EnterMarksRequest;
import com.smartcampus.erp.application.marks.dto.ExamComponentResponse;
import com.smartcampus.erp.application.marks.dto.StudentMarkResponse;
import com.smartcampus.erp.application.marks.dto.StudentResultResponse;
import com.smartcampus.erp.application.marks.service.MarksService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/marks")
@RequiredArgsConstructor
public class MarksController {

    private final MarksService marksService;
    private final StudentProfileRepository studentProfileRepo;

    // ── Exam Components ───────────────────────────────────────────────────

    @GetMapping("/components")
    public ResponseEntity<List<ExamComponentResponse>> getComponents(
            @RequestParam UUID   sectionId,
            @RequestParam String academicYear
    ) {
        return ResponseEntity.ok(marksService.getComponents(sectionId, academicYear));
    }

    @GetMapping("/components/subject")
    public ResponseEntity<List<ExamComponentResponse>> getForSubject(
            @RequestParam UUID   sectionId,
            @RequestParam UUID   subjectId,
            @RequestParam String academicYear
    ) {
        return ResponseEntity.ok(marksService.getComponentsForSubject(sectionId, subjectId, academicYear));
    }

    @PostMapping("/components")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<ExamComponentResponse> createComponent(
            @Valid @RequestBody CreateExamComponentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(marksService.createComponent(req));
    }

    @PatchMapping("/components/{id}/toggle-publish")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<ExamComponentResponse> togglePublish(@PathVariable UUID id) {
        return ResponseEntity.ok(marksService.togglePublish(id));
    }

    @DeleteMapping("/components/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteComponent(@PathVariable UUID id) {
        marksService.deleteComponent(id);
        return ResponseEntity.noContent().build();
    }

    // ── Mark Entry ────────────────────────────────────────────────────────

    @GetMapping("/components/{id}/marks")
    public ResponseEntity<List<StudentMarkResponse>> getMarks(@PathVariable UUID id) {
        return ResponseEntity.ok(marksService.getMarksForComponent(id));
    }

    @PostMapping("/enter")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<List<StudentMarkResponse>> enterMarks(
            @Valid @RequestBody EnterMarksRequest req) {
        return ResponseEntity.ok(marksService.enterMarks(req));
    }

    // ── Result ────────────────────────────────────────────────────────────

    @GetMapping("/result")
    public ResponseEntity<List<StudentResultResponse>> getResult(
            @RequestParam UUID   sectionId,
            @RequestParam String academicYear
    ) {
        return ResponseEntity.ok(marksService.getResult(sectionId, academicYear));
    }


    // ── Exam schedule se ExamComponent create karo ────────────────────────────
    @PostMapping("/components/from-exam/{examScheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<ExamComponentResponse> createFromExam(
            @PathVariable UUID examScheduleId,
            @RequestParam(defaultValue = "0") double weightage) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(marksService.createFromExamSchedule(examScheduleId, weightage));
    }

    // ── Section ke liye completed exams jo marks mein nahi hain ──────────────
    @GetMapping("/pending-exams")
    public ResponseEntity<List<com.smartcampus.erp.application.exam.dto.ExamScheduleResponse>> pendingExams(
            @RequestParam UUID   sectionId,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(marksService.getCompletedExamsWithoutComponents(sectionId, academicYear));
    }


    // ── Student: apne results dekhe ──────────────────────────────────────────
    @GetMapping("/my-results")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentResultResponse> getMyResults(
            Authentication auth,
            @RequestParam String academicYear) {

        StudentProfile student = studentProfileRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null) {
            return ResponseEntity.ok(null);
        }

        List<StudentResultResponse> allResults = marksService.getResult(
                student.getCurrentSection().getId(), academicYear);

        StudentResultResponse myResult = allResults.stream()
                .filter(r -> r.getStudentId().equals(student.getId()))
                .findFirst().orElse(null);

        return ResponseEntity.ok(myResult);
    }
}