package com.smartcampus.erp.presentation.fee;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;


import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.fee.dto.AssignFeeRequest;
import com.smartcampus.erp.application.fee.dto.CreateFeeStructureRequest;
import com.smartcampus.erp.application.fee.dto.FeePaymentResponse;
import com.smartcampus.erp.application.fee.dto.FeeStructureResponse;
import com.smartcampus.erp.application.fee.dto.RecordPaymentRequest;
import com.smartcampus.erp.application.fee.dto.StudentFeeRecordResponse;
import com.smartcampus.erp.application.fee.service.FeeService;
import com.smartcampus.erp.domain.shared.enums.FeeStatus;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
public class FeeController {

    private final FeeService feeService;
    private final StudentProfileRepository studentProfileRepo;

    // ── Fee Structures ────────────────────────────────────────────────────

    @GetMapping("/structures")
    public ResponseEntity<List<FeeStructureResponse>> getAllStructures() {
        return ResponseEntity.ok(feeService.getAllStructures());
    }

    @GetMapping("/structures/{id}")
    public ResponseEntity<FeeStructureResponse> getStructure(@PathVariable UUID id) {
        return ResponseEntity.ok(feeService.getStructureById(id));
    }

    @PostMapping("/structures")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<FeeStructureResponse> createStructure(
            @Valid @RequestBody CreateFeeStructureRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feeService.createStructure(req));
    }

    @DeleteMapping("/structures/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deleteStructure(@PathVariable UUID id) {
        feeService.deleteStructure(id);
        return ResponseEntity.noContent().build();
    }

    // ── Assign fee ────────────────────────────────────────────────────────

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> assignFee(
            @Valid @RequestBody AssignFeeRequest req) {
        int count = feeService.assignFee(req);
        return ResponseEntity.ok(Map.of(
            "message", count + " student(s) ko fee assign ho gai.",
            "count", count
        ));
    }

    // ── Student Fee Records ───────────────────────────────────────────────

    @GetMapping("/records")
    public ResponseEntity<Page<StudentFeeRecordResponse>> getRecords(
            @RequestParam(required = false) UUID      structureId,
            @RequestParam(required = false) FeeStatus status,
            @RequestParam(required = false) String    search,
            @RequestParam(defaultValue = "0")  int   page,
            @RequestParam(defaultValue = "15") int   size
    ) {
        return ResponseEntity.ok(feeService.getRecords(structureId, status, search, page, size));
    }

    @GetMapping("/records/{id}")
    public ResponseEntity<StudentFeeRecordResponse> getRecord(@PathVariable UUID id) {
        return ResponseEntity.ok(feeService.getRecord(id));
    }

    // ── Payments ──────────────────────────────────────────────────────────

    @GetMapping("/records/{id}/payments")
    public ResponseEntity<List<FeePaymentResponse>> getPayments(@PathVariable UUID id) {
        return ResponseEntity.ok(feeService.getPayments(id));
    }

    @PostMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<FeePaymentResponse> recordPayment(
            @Valid @RequestBody RecordPaymentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feeService.recordPayment(req));
    }

    @DeleteMapping("/payments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> deletePayment(@PathVariable UUID id) {
        feeService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }


    // ── Student: apni fee dekhe ───────────────────────────────────────────────
    @GetMapping("/my-records")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<StudentFeeRecordResponse>> getMyFees(
            Authentication auth) {

        StudentProfile student = studentProfileRepo.findByUserEmail(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<StudentFeeRecordResponse> records = feeService
                .getRecordsForStudent(student.getId());

        return ResponseEntity.ok(records);
    }
}