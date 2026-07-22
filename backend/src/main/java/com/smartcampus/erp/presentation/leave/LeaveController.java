package com.smartcampus.erp.presentation.leave;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
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

import com.smartcampus.erp.application.leave.dto.ApplyLeaveRequest;
import com.smartcampus.erp.application.leave.dto.LeaveRequestResponse;
import com.smartcampus.erp.application.leave.dto.LeaveStatsResponse;
import com.smartcampus.erp.application.leave.dto.ReviewLeaveRequest;
import com.smartcampus.erp.application.leave.service.LeaveService;
import com.smartcampus.erp.domain.shared.enums.LeaveStatus;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    // ── Faculty self-service ─────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<LeaveRequestResponse> apply(
            @Valid @RequestBody ApplyLeaveRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveService.apply(req, auth.getName()));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<Page<LeaveRequestResponse>> getMyLeaves(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(leaveService.getMyLeaves(auth.getName(), page, size));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<Void> cancel(@PathVariable UUID id, Authentication auth) {
        leaveService.cancel(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Admin review ──────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Page<LeaveRequestResponse>> getAll(
            @RequestParam(required = false) LeaveStatus status,
            @RequestParam(required = false) UUID        facultyId,
            @RequestParam(required = false) String      search,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(leaveService.getAll(status, facultyId, search, page, size));
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<LeaveRequestResponse> review(
            @PathVariable UUID id, @Valid @RequestBody ReviewLeaveRequest req, Authentication auth) {
        return ResponseEntity.ok(leaveService.review(id, req, auth.getName()));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<LeaveStatsResponse> getStats() {
        return ResponseEntity.ok(leaveService.getStats());
    }
}