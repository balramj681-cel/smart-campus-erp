package com.smartcampus.erp.presentation.document;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.document.dto.IssueCertificateRequest;
import com.smartcampus.erp.application.document.dto.IssuedCertificateResponse;
import com.smartcampus.erp.application.document.service.DocumentService;
import com.smartcampus.erp.domain.shared.enums.CertificateType;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // ── ID Cards ─────────────────────────────────────────────────────────
    @GetMapping("/id-card/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<byte[]> studentIdCard(@PathVariable UUID studentId) {
        return fileResponse(documentService.generateStudentIdCard(studentId), "id_card_student.pdf");
    }

    @GetMapping("/id-card/faculty/{facultyId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<byte[]> facultyIdCard(@PathVariable UUID facultyId) {
        return fileResponse(documentService.generateFacultyIdCard(facultyId), "id_card_faculty.pdf");
    }

    // Student — apna khud ka ID card download karne ke liye
    // myStudentIdCard() method poore body ko is se replace karo:
    @GetMapping("/id-card/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<byte[]> myStudentIdCard(Authentication auth) {
        return fileResponse(documentService.generateMyStudentIdCard(auth.getName()), "my_id_card.pdf");
    }

    // ── Certificates ─────────────────────────────────────────────────────
    @PostMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<IssuedCertificateResponse> issue(
            @Valid @RequestBody IssueCertificateRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.issueCertificate(req, auth.getName()));
    }

    @GetMapping("/certificates/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return fileResponse(documentService.downloadCertificate(id), "certificate.pdf");
    }

    @GetMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<Page<IssuedCertificateResponse>> getAll(
            @RequestParam(required = false) CertificateType type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(documentService.getAll(type, search, page, size));
    }

    @GetMapping("/certificates/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<IssuedCertificateResponse>> getMy(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(documentService.getMyCertificates(auth.getName(), page, size));
    }

    private ResponseEntity<byte[]> fileResponse(byte[] file, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.inline().filename(filename).build());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .headers(headers)
                .body(file);
    }
}
