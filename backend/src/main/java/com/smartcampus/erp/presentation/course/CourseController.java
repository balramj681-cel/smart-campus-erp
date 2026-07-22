package com.smartcampus.erp.presentation.course;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
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

import com.smartcampus.erp.application.course.dto.AssignmentResponse;
import com.smartcampus.erp.application.course.dto.CreateAssignmentRequest;
import com.smartcampus.erp.application.course.dto.CreateSubjectRequest;
import com.smartcampus.erp.application.course.dto.SubjectResponse;
import com.smartcampus.erp.application.course.dto.UpdateSubjectRequest;
import com.smartcampus.erp.application.course.service.AssignmentService;
import com.smartcampus.erp.application.course.service.SubjectService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final SubjectService    subjectService;
    private final AssignmentService assignmentService;

    // ── Subjects ──────────────────────────────────────────────────────────

    @GetMapping("/subjects")
    public ResponseEntity<Page<SubjectResponse>> listSubjects(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "10") int    size,
            @RequestParam(required = false)    String search,
            @RequestParam(required = false)    UUID   semesterId
    ) {
        return ResponseEntity.ok(subjectService.getAll(page, size, search, semesterId));
    }

    @GetMapping("/subjects/by-semester/{semesterId}")
    public ResponseEntity<List<SubjectResponse>> getBySemester(@PathVariable UUID semesterId) {
        return ResponseEntity.ok(subjectService.getBySemester(semesterId));
    }

    @GetMapping("/subjects/{id}")
    public ResponseEntity<SubjectResponse> getSubjectById(@PathVariable UUID id) {
        return ResponseEntity.ok(subjectService.getById(id));
    }

    @PostMapping("/subjects")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SubjectResponse> createSubject(
            @Valid @RequestBody CreateSubjectRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subjectService.create(req));
    }

    @PutMapping("/subjects/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SubjectResponse> updateSubject(
            @PathVariable UUID id, @Valid @RequestBody UpdateSubjectRequest req) {
        return ResponseEntity.ok(subjectService.update(id, req));
    }

    @DeleteMapping("/subjects/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteSubject(@PathVariable UUID id) {
        subjectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Faculty Assignments ───────────────────────────────────────────────

    @GetMapping("/assignments")
    public ResponseEntity<Page<AssignmentResponse>> listAssignments(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "10") int    size,
            @RequestParam(required = false)    String academicYear,
            @RequestParam(required = false)    UUID   subjectId,
            @RequestParam(required = false)    UUID   sectionId,
            @RequestParam(required = false)    UUID   facultyId
    ) {
        return ResponseEntity.ok(
                assignmentService.getAll(page, size, academicYear, subjectId, sectionId, facultyId));
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<AssignmentResponse> createAssignment(
            @Valid @RequestBody CreateAssignmentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(req));
    }

    @DeleteMapping("/assignments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<Void> deleteAssignment(@PathVariable UUID id) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}