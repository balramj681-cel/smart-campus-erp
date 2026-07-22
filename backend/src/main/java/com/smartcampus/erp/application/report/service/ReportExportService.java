package com.smartcampus.erp.application.report.service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.smartcampus.erp.application.attendance.dto.AttendanceSummaryResponse;
import com.smartcampus.erp.application.attendance.dto.SubjectAttendanceSummary;
import com.smartcampus.erp.application.attendance.service.AttendanceService;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.fee.FeePayment;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.FeePaymentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReportExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MMM-yyyy");

    private final StudentProfileRepository studentRepo;
    private final FeePaymentRepository     paymentRepo;
    private final AttendanceService        attendanceService;

    // ── Student List Report ─────────────────────────────────────────────

    public byte[] exportStudentsExcel(Integer batch) {
        List<StudentProfile> students = filterStudentsByBatch(batch);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Students");
            CellStyle headerStyle = headerStyle(wb);

            String[] headers = { "Enrollment No", "Name", "Email", "Phone", "Batch",
                "Department", "Program", "Section", "Gender", "Admission Date" };
            writeHeaderRow(sheet, headerStyle, headers);

            int rowNum = 1;
            for (StudentProfile s : students) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(s.getEnrollmentNumber());
                row.createCell(1).setCellValue(s.getUser().getFirstName() + " " + s.getUser().getLastName());
                row.createCell(2).setCellValue(s.getUser().getEmail());
                row.createCell(3).setCellValue(nullSafe(s.getPhone()));
                row.createCell(4).setCellValue(s.getBatch());
                row.createCell(5).setCellValue(departmentName(s));
                row.createCell(6).setCellValue(programName(s));
                row.createCell(7).setCellValue(sectionName(s));
                row.createCell(8).setCellValue(s.getGender() != null ? s.getGender().name() : "");
                row.createCell(9).setCellValue(s.getAdmissionDate() != null
                        ? s.getAdmissionDate().format(DATE_FMT) : "");
            }

            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate student Excel report", e);
        }
    }

    public byte[] exportStudentsPdf(Integer batch) {
        List<StudentProfile> students = filterStudentsByBatch(batch);

        String[] headers = { "Enrollment No", "Name", "Batch", "Department", "Section" };
        List<String[]> rows = students.stream()
                .map(s -> new String[] {
                    s.getEnrollmentNumber(),
                    s.getUser().getFirstName() + " " + s.getUser().getLastName(),
                    String.valueOf(s.getBatch()),
                    departmentName(s),
                    sectionName(s)
                })
                .toList();

        String title = "Student List Report" + (batch != null ? " — Batch " + batch : "");
        return buildPdfTable(title, headers, rows);
    }

    // ── Fee Collection Report ───────────────────────────────────────────

    public byte[] exportFeeCollectionExcel(LocalDate from, LocalDate to) {
        List<FeePayment> payments = paymentRepo.findAllByPaymentDateBetweenOrderByPaymentDateDesc(from, to);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Fee Collection");
            CellStyle headerStyle = headerStyle(wb);

            String[] headers = { "Receipt No", "Student Name", "Enrollment No", "Amount (₹)",
                "Payment Date", "Payment Mode", "Transaction ID", "Remarks" };
            writeHeaderRow(sheet, headerStyle, headers);

            int rowNum = 1;
            double total = 0;
            for (FeePayment p : payments) {
                StudentProfile student = p.getStudentFeeRecord().getStudent();
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(p.getReceiptNumber());
                row.createCell(1).setCellValue(student.getUser().getFirstName() + " " + student.getUser().getLastName());
                row.createCell(2).setCellValue(student.getEnrollmentNumber());
                row.createCell(3).setCellValue(p.getAmount());
                row.createCell(4).setCellValue(p.getPaymentDate().format(DATE_FMT));
                row.createCell(5).setCellValue(p.getPaymentMode().getDisplayName());
                row.createCell(6).setCellValue(nullSafe(p.getTransactionId()));
                row.createCell(7).setCellValue(nullSafe(p.getRemarks()));
                total += p.getAmount();
            }

            // Totals row
            Row totalRow = sheet.createRow(rowNum + 1);
            Cell labelCell = totalRow.createCell(2);
            labelCell.setCellValue("Total Collected:");
            labelCell.setCellStyle(headerStyle);
            Cell totalCell = totalRow.createCell(3);
            totalCell.setCellValue(total);
            totalCell.setCellStyle(headerStyle);

            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate fee collection Excel report", e);
        }
    }

    // ── Attendance Summary Report ───────────────────────────────────────

    public byte[] exportAttendanceExcel(UUID sectionId, String academicYear) {
        List<AttendanceSummaryResponse> summaries = attendanceService.getSummary(sectionId, academicYear);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Attendance Summary");
            CellStyle headerStyle = headerStyle(wb);

            String[] headers = { "Enrollment No", "Student Name", "Subject", "Total Sessions",
                "Attended", "Absent", "Percentage", "Status" };
            writeHeaderRow(sheet, headerStyle, headers);

            int rowNum = 1;
            for (AttendanceSummaryResponse summary : summaries) {
                for (SubjectAttendanceSummary subject : summary.getSubjects()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(summary.getEnrollmentNumber());
                    row.createCell(1).setCellValue(summary.getStudentName());
                    row.createCell(2).setCellValue(subject.getSubjectName());
                    row.createCell(3).setCellValue(subject.getTotalSessions());
                    row.createCell(4).setCellValue(subject.getAttendedSessions());
                    row.createCell(5).setCellValue(subject.getAbsentSessions());
                    row.createCell(6).setCellValue(subject.getPercentage());
                    row.createCell(7).setCellValue(subject.getStatusLabel());
                }
            }

            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate attendance Excel report", e);
        }
    }

    // ── Excel helpers ────────────────────────────────────────────────────

    private CellStyle headerStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private void writeHeaderRow(XSSFSheet sheet, CellStyle headerStyle, String[] headers) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void autoSizeColumns(XSSFSheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private byte[] toBytes(XSSFWorkbook wb) throws Exception {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── PDF helper ───────────────────────────────────────────────────────

    private byte[] buildPdfTable(String title, String[] headers, List<String[]> rows) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 24, 24, 36, 24);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont =
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 16, com.lowagie.text.Font.BOLD);
            Paragraph titlePara = new Paragraph(title, titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingAfter(16);
            document.add(titlePara);

            PdfPTable table = new PdfPTable(headers.length);
            table.setWidthPercentage(100);

            com.lowagie.text.Font headerFont =
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.BOLD);
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(header, headerFont));
                cell.setPadding(6);
                cell.setBackgroundColor(new java.awt.Color(238, 238, 245));
                table.addCell(cell);
            }

            com.lowagie.text.Font cellFont =
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9);
            for (String[] rowValues : rows) {
                for (String value : rowValues) {
                    PdfPCell cell = new PdfPCell(new Paragraph(value != null ? value : "", cellFont));
                    cell.setPadding(5);
                    table.addCell(cell);
                }
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate PDF report", e);
        }
    }

    // ── Shared helpers ───────────────────────────────────────────────────

    private List<StudentProfile> filterStudentsByBatch(Integer batch) {
        return studentRepo.findAll().stream()
                .filter(s -> batch == null || s.getBatch() == batch)
                .sorted((a, b) -> a.getEnrollmentNumber().compareTo(b.getEnrollmentNumber()))
                .toList();
    }

    private String departmentName(StudentProfile s) {
        return s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getDepartment().getName() : "";
    }

    private String programName(StudentProfile s) {
        return s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getName() : "";
    }

    private String sectionName(StudentProfile s) {
        return s.getCurrentSection() != null ? s.getCurrentSection().getName() : "";
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}