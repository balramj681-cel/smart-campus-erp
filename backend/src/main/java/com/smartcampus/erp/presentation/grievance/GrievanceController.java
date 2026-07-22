package com.smartcampus.erp.presentation.grievance;

import java.util.Map;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.grievance.dto.CreateGrievanceRequest;
import com.smartcampus.erp.application.grievance.dto.GrievanceResponse;
import com.smartcampus.erp.application.grievance.dto.UpdateGrievanceStatusRequest;
import com.smartcampus.erp.application.grievance.service.GrievanceService;
import com.smartcampus.erp.domain.shared.enums.GrievanceCategory;
import com.smartcampus.erp.domain.shared.enums.GrievanceStatus;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/grievances")
@RequiredArgsConstructor
public class GrievanceController {

    private final GrievanceService grievanceService;

    @GetMapping("/my")
    public ResponseEntity<Page<GrievanceResponse>> getMy(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(grievanceService.getMyGrievances(auth.getName(), page, size));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<Page<GrievanceResponse>> getAll(
            @RequestParam(required = false) GrievanceStatus   status,
            @RequestParam(required = false) GrievanceCategory category,
            @RequestParam(required = false) String            search,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
                grievanceService.getAllForAdmin(status, category, search, page, size));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(grievanceService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GrievanceResponse> getById(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(grievanceService.getById(id, auth));
    }

    @PostMapping
    public ResponseEntity<GrievanceResponse> create(
            @Valid @RequestBody CreateGrievanceRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(grievanceService.create(req, auth.getName()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','STAFF')")
    public ResponseEntity<GrievanceResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGrievanceStatusRequest req) {
        return ResponseEntity.ok(grievanceService.updateStatus(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        grievanceService.delete(id, auth);
        return ResponseEntity.noContent().build();
    }
}