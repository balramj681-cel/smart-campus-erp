package com.smartcampus.erp.presentation.coursework;

import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.coursework.dto.AssignmentResponse;
import com.smartcampus.erp.application.coursework.dto.CreateAssignmentRequest;
import com.smartcampus.erp.application.coursework.dto.TeachingLoadResponse;
import com.smartcampus.erp.application.coursework.service.CourseworkAssignmentService;
import com.smartcampus.erp.domain.coursework.Assignment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/coursework/assignments")
@RequiredArgsConstructor
public class CourseworkAssignmentController {

    private final CourseworkAssignmentService assignmentService;

    // Mixed JSON + file multipart request: "data" is the assignment fields
    // as a JSON blob part, "file" is the optional question-paper attachment.
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AssignmentResponse> create(
            @Valid @RequestPart("data") CreateAssignmentRequest req,
            @RequestPart(value = "file", required = false) MultipartFile file,
            Authentication auth) {
        boolean isFacultyOrHod = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_HOD"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assignmentService.create(req, file, auth.getName(), isFacultyOrHod));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AssignmentResponse> update(
            @PathVariable UUID id, @Valid @RequestBody CreateAssignmentRequest req) {
        return ResponseEntity.ok(assignmentService.update(id, req));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AssignmentResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(assignmentService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Admin/HOD-wide listing — can filter by any facultyId.
    @GetMapping
    @PreAuthorize("hasAnyRole('HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Page<AssignmentResponse>> getAll(
            @RequestParam(required = false) UUID   sectionId,
            @RequestParam(required = false) UUID   subjectId,
            @RequestParam(required = false) UUID   facultyId,
            @RequestParam(required = false) String academicYear,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(assignmentService.getAll(sectionId, subjectId, facultyId, academicYear, page, size));
    }

    // Faculty's own listing — always scoped server-side to the logged-in
    // faculty member, so a faculty member only ever sees their own
    // assignments (never another faculty's).
    @GetMapping("/my-created")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<Page<AssignmentResponse>> getMyCreated(
            Authentication auth,
            @RequestParam(required = false) String academicYear,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(assignmentService.getMyCreatedAssignments(auth.getName(), academicYear, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(assignmentService.getById(id));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<AssignmentResponse>> getForStudent(
            Authentication auth, @RequestParam String academicYear) {
        return ResponseEntity.ok(assignmentService.getForStudent(auth.getName(), academicYear));
    }

    @GetMapping("/my-teaching-load")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<List<TeachingLoadResponse>> getMyTeachingLoad(
            Authentication auth, @RequestParam String academicYear) {
        return ResponseEntity.ok(assignmentService.getMyTeachingLoad(auth.getName(), academicYear));
    }

    // ── Attachment download (question paper / instructions) ──────────────

    @GetMapping("/{id}/attachment/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable UUID id, Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        Assignment assignment = assignmentService.getAssignmentForAttachmentDownload(id, auth.getName(), isAdmin);
        Resource resource = assignmentService.loadAttachmentResource(assignment);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(assignment.getAttachmentFileName()).build());

        MediaType mediaType = assignment.getAttachmentContentType() != null
                ? MediaType.parseMediaType(assignment.getAttachmentContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .headers(headers)
                .body(resource);
    }
}