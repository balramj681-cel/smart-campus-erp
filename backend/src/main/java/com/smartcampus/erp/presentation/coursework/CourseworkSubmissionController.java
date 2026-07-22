package com.smartcampus.erp.presentation.coursework;

import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.coursework.dto.GradeSubmissionRequest;
import com.smartcampus.erp.application.coursework.dto.SubmissionResponse;
import com.smartcampus.erp.application.coursework.service.CourseworkSubmissionService;
import com.smartcampus.erp.domain.coursework.AssignmentSubmission;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/coursework/submissions")
@RequiredArgsConstructor
public class CourseworkSubmissionController {

    private final CourseworkSubmissionService submissionService;

    @PostMapping(value = "/{assignmentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<SubmissionResponse> submit(
            @PathVariable UUID assignmentId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(submissionService.submit(assignmentId, file, auth.getName()));
    }

    @GetMapping("/assignment/{assignmentId}")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForAssignment(
            @PathVariable UUID assignmentId, Authentication auth) {
        boolean isFacultyOrHod = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_HOD"));
        return ResponseEntity.ok(
                submissionService.getSubmissionsForAssignment(assignmentId, auth.getName(), isFacultyOrHod));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<SubmissionResponse>> getMySubmissions(Authentication auth) {
        return ResponseEntity.ok(submissionService.getMySubmissions(auth.getName()));
    }

    @PatchMapping("/{id}/grade")
    @PreAuthorize("hasAnyRole('FACULTY','HOD','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SubmissionResponse> grade(
            @PathVariable UUID id, @Valid @RequestBody GradeSubmissionRequest req, Authentication auth) {
        return ResponseEntity.ok(submissionService.grade(id, req, auth.getName()));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id, Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        AssignmentSubmission submission =
                submissionService.getSubmissionForDownload(id, auth.getName(), isAdmin);
        Resource resource = submissionService.loadFileResource(submission);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(submission.getOriginalFileName()).build());

        MediaType mediaType = submission.getContentType() != null
                ? MediaType.parseMediaType(submission.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .headers(headers)
                .body(resource);
    }
}