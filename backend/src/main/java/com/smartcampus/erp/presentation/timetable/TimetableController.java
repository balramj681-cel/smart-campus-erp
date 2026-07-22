package com.smartcampus.erp.presentation.timetable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

import com.smartcampus.erp.application.timetable.dto.CreateTimetableEntryRequest;
import com.smartcampus.erp.application.timetable.dto.TimetableEntryResponse;
import com.smartcampus.erp.application.timetable.service.TimetableService;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final StudentProfileRepository studentProfileRepo;
    private final FacultyProfileRepository facultyRepo;

    // ── GET: Section timetable ────────────────────────────────────────────
    @GetMapping("/section/{sectionId}")
    public ResponseEntity<List<TimetableEntryResponse>> getForSection(
            @PathVariable UUID sectionId,
            @RequestParam String academicYear,
            @RequestParam(required = false) java.time.LocalDate weekOf) {
        if (weekOf != null) {
            return ResponseEntity.ok(timetableService.getForSectionWeek(sectionId, academicYear, weekOf));
        }
        return ResponseEntity.ok(timetableService.getForSection(sectionId, academicYear));
    }

    @PostMapping("/{id}/cancel-week")
    public ResponseEntity<TimetableEntryResponse> cancelForWeek(
            @PathVariable UUID id, @RequestParam java.time.LocalDate weekOf) {
        return ResponseEntity.ok(timetableService.cancelForWeek(id, weekOf));
    }

    // ── GET: Faculty timetable ────────────────────────────────────────────
    @GetMapping("/faculty/{facultyId}")
    public ResponseEntity<List<TimetableEntryResponse>> getForFaculty(
            @PathVariable UUID facultyId,
            @RequestParam String academicYear,
            @RequestParam(required = false) java.time.LocalDate weekOf) {
        return ResponseEntity.ok(weekOf != null
                ? timetableService.getForFacultyWeek(facultyId, academicYear, weekOf)
                : timetableService.getForFaculty(facultyId, academicYear));
    }

    // ── POST: Create entry ────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<TimetableEntryResponse> create(
            @Valid @RequestBody CreateTimetableEntryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetableService.create(req));
    }

    // ── PUT: Update entry ─────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<TimetableEntryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTimetableEntryRequest req) {
        return ResponseEntity.ok(timetableService.update(id, req));
    }

    // ── DELETE: Remove entry ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        timetableService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── GET: Timetable for a specific date (section ke liye) ──────────────────
    @GetMapping("/by-date")
    public ResponseEntity<List<TimetableEntryResponse>> getForDate(
            @RequestParam UUID sectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String academicYear) {
        return ResponseEntity.ok(timetableService.getForDate(sectionId, date, academicYear));
    }

    // ── Student: apni section ka timetable ───────────────────────────────────
    @GetMapping("/my-timetable")
    public ResponseEntity<List<TimetableEntryResponse>> getMyTimetable(
            Authentication auth,
            @RequestParam String academicYear,
            @RequestParam(required = false) java.time.LocalDate weekOf) {

        String email = auth.getName();

        // Student?
        Optional<StudentProfile> student = studentProfileRepo.findByUserEmail(email);
        if (student.isPresent() && student.get().getCurrentSection() != null) {
            return ResponseEntity.ok(weekOf != null
                    ? timetableService.getForSectionWeek(student.get().getCurrentSection().getId(), academicYear, weekOf)
                    : timetableService.getForSection(student.get().getCurrentSection().getId(), academicYear));
        }

        // Faculty?
        Optional<FacultyProfile> faculty = facultyRepo.findByUserEmail(email);
        if (faculty.isPresent()) {
            return ResponseEntity.ok(weekOf != null
                    ? timetableService.getForFacultyWeek(faculty.get().getId(), academicYear, weekOf)
                    : timetableService.getForFaculty(faculty.get().getId(), academicYear));
        }

        return ResponseEntity.ok(List.of());
    }
}
