package com.smartcampus.erp.presentation.attendance;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.attendance.dto.QrProgressResponse;
import com.smartcampus.erp.application.attendance.dto.QrScanResponse;
import com.smartcampus.erp.application.attendance.dto.QrSessionResponse;
import com.smartcampus.erp.application.attendance.dto.StartQrSessionRequest;
import com.smartcampus.erp.application.attendance.service.QrAttendanceService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/attendance/qr")
@RequiredArgsConstructor
public class QrAttendanceController {

    private final QrAttendanceService qrAttendanceService;

    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<QrSessionResponse> start(
            @Valid @RequestBody StartQrSessionRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(qrAttendanceService.startSession(req, auth.getName()));
    }

    @GetMapping("/{sessionId}/progress")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<QrProgressResponse> progress(
            @PathVariable UUID sessionId, Authentication auth) {
        return ResponseEntity.ok(qrAttendanceService.getProgress(sessionId, auth.getName()));
    }

    @PostMapping("/scan/{token}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<QrScanResponse> scan(
            @PathVariable String token, Authentication auth) {
        return ResponseEntity.ok(qrAttendanceService.scan(token, auth.getName()));
    }

    @PostMapping("/{sessionId}/finalize")
    @PreAuthorize("hasAnyRole('FACULTY','HOD')")
    public ResponseEntity<QrProgressResponse> finalize(
            @PathVariable UUID sessionId, Authentication auth) {
        return ResponseEntity.ok(qrAttendanceService.finalizeSession(sessionId, auth.getName()));
    }
}