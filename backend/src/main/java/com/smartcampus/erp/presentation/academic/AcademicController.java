package com.smartcampus.erp.presentation.academic;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.academic.dto.CreateDepartmentRequest;
import com.smartcampus.erp.application.academic.dto.CreateProgramRequest;
import com.smartcampus.erp.application.academic.dto.CreateSectionRequest;
import com.smartcampus.erp.application.academic.dto.CreateSemesterRequest;
import com.smartcampus.erp.application.academic.dto.DepartmentResponse;
import com.smartcampus.erp.application.academic.dto.ProgramResponse;
import com.smartcampus.erp.application.academic.dto.SectionResponse;
import com.smartcampus.erp.application.academic.dto.SemesterResponse;
import com.smartcampus.erp.application.academic.service.DepartmentService;
import com.smartcampus.erp.application.academic.service.ProgramService;
import com.smartcampus.erp.application.academic.service.SectionService;
import com.smartcampus.erp.application.academic.service.SemesterService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/academic")
@RequiredArgsConstructor
public class AcademicController {

    private final DepartmentService deptService;
    private final ProgramService    programService;
    private final SemesterService   semesterService;
    private final SectionService    sectionService;

    // ── DEPARTMENTS ──────────────────────────────────────────────────────────

    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentResponse>> getDepartments() {
        return ResponseEntity.ok(deptService.getAll());
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<DepartmentResponse> createDept(@Valid @RequestBody CreateDepartmentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deptService.create(req));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<DepartmentResponse> updateDept(
            @PathVariable UUID id, @Valid @RequestBody CreateDepartmentRequest req) {
        return ResponseEntity.ok(deptService.update(id, req));
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteDept(@PathVariable UUID id) {
        deptService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── PROGRAMS ─────────────────────────────────────────────────────────────

    @GetMapping("/programs")
    public ResponseEntity<List<ProgramResponse>> getPrograms(
            @RequestParam(required = false) UUID departmentId) {
        return ResponseEntity.ok(departmentId != null
                ? programService.getByDepartment(departmentId)
                : programService.getAll());
    }

    @PostMapping("/programs")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<ProgramResponse> createProgram(@Valid @RequestBody CreateProgramRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(programService.create(req));
    }

    @PutMapping("/programs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<ProgramResponse> updateProgram(
            @PathVariable UUID id, @Valid @RequestBody CreateProgramRequest req) {
        return ResponseEntity.ok(programService.update(id, req));
    }

    @DeleteMapping("/programs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteProgram(@PathVariable UUID id) {
        programService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── SEMESTERS ────────────────────────────────────────────────────────────

    @GetMapping("/semesters")
    public ResponseEntity<List<SemesterResponse>> getSemesters(@RequestParam UUID programId) {
        return ResponseEntity.ok(semesterService.getByProgram(programId));
    }

    @PostMapping("/semesters")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SemesterResponse> createSemester(@Valid @RequestBody CreateSemesterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(semesterService.create(req));
    }

    @PutMapping("/semesters/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SemesterResponse> updateSemester(
            @PathVariable UUID id, @Valid @RequestBody CreateSemesterRequest req) {
        return ResponseEntity.ok(semesterService.update(id, req));
    }

    @DeleteMapping("/semesters/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteSemester(@PathVariable UUID id) {
        semesterService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── SECTIONS ─────────────────────────────────────────────────────────────

    @GetMapping("/sections")
    public ResponseEntity<List<SectionResponse>> getSections(@RequestParam UUID semesterId) {
        return ResponseEntity.ok(sectionService.getBySemester(semesterId));
    }

    @PostMapping("/sections")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SectionResponse> createSection(@Valid @RequestBody CreateSectionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.create(req));
    }

    @PutMapping("/sections/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SectionResponse> updateSection(
            @PathVariable UUID id, @Valid @RequestBody CreateSectionRequest req) {
        return ResponseEntity.ok(sectionService.update(id, req));
    }

    @DeleteMapping("/sections/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID id) {
        sectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}