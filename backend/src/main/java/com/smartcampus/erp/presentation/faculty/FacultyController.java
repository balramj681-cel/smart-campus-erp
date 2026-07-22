package com.smartcampus.erp.presentation.faculty;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

import com.smartcampus.erp.application.faculty.dto.CreateFacultyRequest;
import com.smartcampus.erp.application.faculty.dto.FacultyResponse;
import com.smartcampus.erp.application.faculty.dto.LinkFacultyProfileRequest;
import com.smartcampus.erp.application.faculty.dto.UpdateFacultyRequest;
import com.smartcampus.erp.application.faculty.service.FacultyService;
import com.smartcampus.erp.domain.shared.enums.Designation;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/faculty")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<Page<FacultyResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) Designation designation
    ) {
        return ResponseEntity.ok(facultyService.getAll(page, size, search, departmentId, designation));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<FacultyResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(facultyService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<FacultyResponse> create(@Valid @RequestBody CreateFacultyRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facultyService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<FacultyResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateFacultyRequest req) {
        return ResponseEntity.ok(facultyService.update(id, req));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<FacultyResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(facultyService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        facultyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/link/{userId}")
    public ResponseEntity<FacultyResponse> linkExistingUser(
            @PathVariable UUID userId, @Valid @RequestBody LinkFacultyProfileRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facultyService.linkExistingUser(userId, req));
    }
}
