package com.smartcampus.erp.presentation.student;

import java.util.UUID;

import org.springframework.data.domain.Page;
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

import com.smartcampus.erp.application.student.dto.AssignSectionRequest;
import com.smartcampus.erp.application.student.dto.CreateStudentRequest;
import com.smartcampus.erp.application.student.dto.StudentResponse;
import com.smartcampus.erp.application.student.dto.UpdateStudentRequest;
import com.smartcampus.erp.application.student.service.StudentService;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;


import com.smartcampus.erp.application.student.dto.LinkStudentProfileRequest;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final StudentProfileRepository studentProfileRepo;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<Page<StudentResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer batch
    ) {
        return ResponseEntity.ok(studentService.getAll(page, size, search, batch));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<StudentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StudentResponse> create(@Valid @RequestBody CreateStudentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StudentResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStudentRequest req) {
        return ResponseEntity.ok(studentService.update(id, req));
    }

    @PatchMapping("/{id}/assign-section")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StudentResponse> assignSection(
            @PathVariable UUID id,
            @Valid @RequestBody AssignSectionRequest req) {
        return ResponseEntity.ok(studentService.assignSection(id, req));
    }

    @PatchMapping("/{id}/remove-section")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<StudentResponse> removeSection(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.removeSection(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        studentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Student apna profile dekhe ────────────────────────────────────────────
    @GetMapping("/my-profile")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentResponse> getMyProfile(Authentication auth) {
        StudentProfile profile = studentProfileRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        return ResponseEntity.ok(studentService.getById(profile.getId()));
    }

    @PostMapping("/link/{userId}")
    public ResponseEntity<StudentResponse> linkExistingUser(
            @PathVariable UUID userId, @Valid @RequestBody LinkStudentProfileRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentService.linkExistingUser(userId, req));
    }
}
