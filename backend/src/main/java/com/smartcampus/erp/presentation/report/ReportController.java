package com.smartcampus.erp.presentation.report;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.report.service.ReportExportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
public class ReportController {

    private static final MediaType XLSX_TYPE =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ReportExportService reportExportService;

    @GetMapping("/students/excel")
    public ResponseEntity<byte[]> exportStudentsExcel(@RequestParam(required = false) Integer batch) {
        byte[] file = reportExportService.exportStudentsExcel(batch);
        String filename = "students" + (batch != null ? "_batch" + batch : "") + ".xlsx";
        return fileResponse(file, XLSX_TYPE, filename);
    }

    @GetMapping("/students/pdf")
    public ResponseEntity<byte[]> exportStudentsPdf(@RequestParam(required = false) Integer batch) {
        byte[] file = reportExportService.exportStudentsPdf(batch);
        String filename = "students" + (batch != null ? "_batch" + batch : "") + ".pdf";
        return fileResponse(file, MediaType.APPLICATION_PDF, filename);
    }

    @GetMapping("/fee-collection/excel")
    public ResponseEntity<byte[]> exportFeeCollectionExcel(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        byte[] file = reportExportService.exportFeeCollectionExcel(from, to);
        String filename = "fee_collection_" + from + "_to_" + to + ".xlsx";
        return fileResponse(file, XLSX_TYPE, filename);
    }

    @GetMapping("/attendance/excel")
    public ResponseEntity<byte[]> exportAttendanceExcel(
            @RequestParam UUID sectionId,
            @RequestParam String academicYear) {
        byte[] file = reportExportService.exportAttendanceExcel(sectionId, academicYear);
        String filename = "attendance_summary_" + academicYear.replace("/", "-") + ".xlsx";
        return fileResponse(file, XLSX_TYPE, filename);
    }

    // ── Helper ───────────────────────────────────────────────────────────

    private ResponseEntity<byte[]> fileResponse(byte[] file, MediaType type, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok()
                .contentType(type)
                .headers(headers)
                .body(file);
    }
}