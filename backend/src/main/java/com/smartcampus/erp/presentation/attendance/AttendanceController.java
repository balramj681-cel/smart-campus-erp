package com.smartcampus.erp.presentation.attendance;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.attendance.dto.AttendanceRecordResponse;
import com.smartcampus.erp.application.attendance.dto.AttendanceSessionResponse;
import com.smartcampus.erp.application.attendance.dto.AttendanceSummaryResponse;
import com.smartcampus.erp.application.attendance.dto.CreateAttendanceSessionRequest;
import com.smartcampus.erp.application.attendance.service.AttendanceService;
import com.smartcampus.erp.application.timetable.dto.TimetableEntryResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final StudentProfileRepository studentProfileRepo;

    // ── Faculty ka auto-schedule (Bug 2) ──────────────────────────────────────
    @GetMapping("/my-schedule")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<List<TimetableEntryResponse>> getMySchedule(
            Authentication auth,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(
                attendanceService.getFacultyScheduleForDate(auth.getName(), date, academicYear));
    }

    @GetMapping("/my-sessions")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<Page<AttendanceSessionResponse>> mySessions(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ResponseEntity.ok(attendanceService.getMySessions(auth.getName(), page, size));
    }

    // ── Students in section ───────────────────────────────────────────────────
    @GetMapping("/students/{sectionId}")
    public ResponseEntity<List<AttendanceRecordResponse>> getStudents(@PathVariable UUID sectionId) {
        return ResponseEntity.ok(attendanceService.getStudentsForSection(sectionId));
    }

    // ── Mark attendance ───────────────────────────────────────────────────────
    @PostMapping("/sessions")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AttendanceSessionResponse> mark(
            @Valid @RequestBody CreateAttendanceSessionRequest req,
            Authentication auth) {
        boolean isFacultyOrHod = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY")
                || a.getAuthority().equals("ROLE_HOD"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attendanceService.markAttendance(req, auth.getName(), isFacultyOrHod));
    }

    // ── Edit attendance (Bug 3) ───────────────────────────────────────────────
    @PutMapping("/sessions/{id}")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AttendanceSessionResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateAttendanceSessionRequest req,
            Authentication auth) {
        boolean isFacultyOrHod = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY")
                || a.getAuthority().equals("ROLE_HOD"));
        return ResponseEntity.ok(
                attendanceService.updateSession(id, req, auth.getName(), isFacultyOrHod));
    }

    // ── List sessions ─────────────────────────────────────────────────────────
    @GetMapping("/sessions")
    public ResponseEntity<Page<AttendanceSessionResponse>> list(
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) UUID subjectId,
            @RequestParam(required = false) UUID facultyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String academicYear,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ResponseEntity.ok(
                attendanceService.getSessions(sectionId, subjectId, facultyId,
                        from, to, academicYear, page, size));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<AttendanceSessionResponse> getSession(@PathVariable UUID id) {
        return ResponseEntity.ok(attendanceService.getSession(id));
    }

    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        attendanceService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<List<AttendanceSummaryResponse>> summary(
            @RequestParam UUID sectionId,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(attendanceService.getSummary(sectionId, academicYear));
    }

    // ── Student: apni attendance summary ─────────────────────────────────────
    @GetMapping("/my-attendance")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AttendanceSummaryResponse>> getMyAttendance(
            Authentication auth,
            @RequestParam String academicYear) {

        StudentProfile student = studentProfileRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null) {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(
                attendanceService.getSummaryForStudent(
                        student.getId(),
                        student.getCurrentSection().getId(),
                        academicYear));
    }
}
