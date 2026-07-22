package com.smartcampus.erp.presentation.exam;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;

import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.exam.dto.CreateExamScheduleRequest;
import com.smartcampus.erp.application.exam.dto.ExamScheduleResponse;
import com.smartcampus.erp.application.exam.dto.HallTicketResponse;
import com.smartcampus.erp.application.exam.service.ExamService;
import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.domain.shared.enums.ExamType;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;
    private final StudentProfileRepository studentProfileRepo;

    @GetMapping
    public ResponseEntity<Page<ExamScheduleResponse>> list(
            @RequestParam(required = false) UUID       sectionId,
            @RequestParam(required = false) ExamStatus status,
            @RequestParam(required = false) ExamType   examType,
            @RequestParam(required = false) String     academicYear,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "15") int    size
    ) {
        return ResponseEntity.ok(
                examService.getAll(sectionId, status, examType, academicYear, from, to, page, size));
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<ExamScheduleResponse>> getForSection(
            @PathVariable UUID   sectionId,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(examService.getForSection(sectionId, academicYear));
    }

    @GetMapping("/by-date")
    public ResponseEntity<List<ExamScheduleResponse>> getForDate(
            @RequestParam UUID      sectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String    academicYear) {
        return ResponseEntity.ok(examService.getForDate(sectionId, date, academicYear));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<ExamScheduleResponse> create(
            @Valid @RequestBody CreateExamScheduleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<ExamScheduleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateExamScheduleRequest req) {
        return ResponseEntity.ok(examService.update(id, req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<ExamScheduleResponse> updateStatus(
            @PathVariable UUID       id,
            @RequestParam ExamStatus status) {
        return ResponseEntity.ok(examService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        examService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hall-tickets")
    public ResponseEntity<List<HallTicketResponse>> getHallTickets(
            @RequestParam UUID     sectionId,
            @RequestParam String   academicYear,
            @RequestParam(required = false) ExamType examType) {
        return ResponseEntity.ok(examService.getHallTickets(sectionId, academicYear, examType));
    }



    // ya constructor injection agar DebarmentService inject karo
    private com.smartcampus.erp.application.exam.service.DebarmentService debarmentService;

    // ── Debar student ─────────────────────────────────────────────────────────
    @PostMapping("/debar")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<Void> debarStudent(
            @RequestParam UUID   studentId,
            @RequestParam UUID   sectionId,
            @RequestParam UUID   subjectId,
            @RequestParam String academicYear,
            @RequestParam(defaultValue = "Low attendance") String reason,
            Authentication auth) {
        debarmentService.debar(studentId, sectionId, subjectId,
                academicYear, reason, auth.getName());
        return ResponseEntity.ok().build();
    }

    // ── Lift debarment ────────────────────────────────────────────────────────
    @DeleteMapping("/debar")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<Void> liftDebarment(
            @RequestParam UUID   studentId,
            @RequestParam UUID   sectionId,
            @RequestParam UUID   subjectId,
            @RequestParam String academicYear) {
        debarmentService.liftDebarment(studentId, sectionId, subjectId, academicYear);
        return ResponseEntity.ok().build();
    }


    // ── Student: apna exam schedule ───────────────────────────────────────────
    @GetMapping("/my-exams")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<ExamScheduleResponse>> getMyExams(
            Authentication auth,
            @RequestParam String academicYear) {

        StudentProfile student = studentProfileRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null) return ResponseEntity.ok(List.of());

        return ResponseEntity.ok(examService.getForSection(
                student.getCurrentSection().getId(), academicYear));
    }
}