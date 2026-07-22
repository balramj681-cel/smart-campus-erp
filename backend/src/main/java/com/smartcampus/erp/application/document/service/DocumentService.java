package com.smartcampus.erp.application.document.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.smartcampus.erp.application.document.dto.IssueCertificateRequest;
import com.smartcampus.erp.application.document.dto.IssuedCertificateResponse;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.document.IssuedCertificate;
import com.smartcampus.erp.domain.shared.enums.CertificateType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.document.repository.IssuedCertificateRepository;

import lombok.RequiredArgsConstructor;

/**
 * Generates two kinds of printable documents with OpenPDF (the same
 * {@code com.lowagie.text} library
 * {@link com.smartcampus.erp.application.report.service.ReportExportService}
 * already uses):
 * <ul>
 * <li><b>ID cards</b> — regenerated fresh from the live profile every time,
 * never persisted (there's nothing to audit; it's always "current").</li>
 * <li><b>Certificates</b> — a {@link IssuedCertificate} audit row is persisted
 * first (who/what/when/why), then the PDF is built from it. Re-downloading
 * later regenerates an identical PDF from that same row rather than storing the
 * binary.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final String COLLEGE_NAME = "Smart Campus Institute of Technology";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    private final StudentProfileRepository studentRepo;
    private final FacultyProfileRepository facultyRepo;
    private final UserRepository userRepo;
    private final IssuedCertificateRepository certificateRepo;

    // ── ID Cards ─────────────────────────────────────────────────────────
    public byte[] generateStudentIdCard(UUID studentId) {
        StudentProfile s = studentRepo.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        String program = s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getName() : "—";
        String department = s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getDepartment().getName() : "—";

        return buildIdCard(
                s.getUser().getFirstName() + " " + s.getUser().getLastName(),
                "STUDENT",
                new String[][]{
                    {"Enrollment No", s.getEnrollmentNumber()},
                    {"Program", program},
                    {"Department", department},
                    {"Batch", String.valueOf(s.getBatch())},
                    {"Blood Group", s.getBloodGroup() != null ? s.getBloodGroup().name() : "—"},});
    }

    public byte[] generateFacultyIdCard(UUID facultyId) {
        FacultyProfile f = facultyRepo.findById(facultyId)
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found"));

        return buildIdCard(
                f.getUser().getFirstName() + " " + f.getUser().getLastName(),
                "FACULTY",
                new String[][]{
                    {"Employee ID", f.getEmployeeId()},
                    {"Designation", f.getDesignation().name()},
                    {"Department", f.getDepartment() != null ? f.getDepartment().getName() : "—"},
                    {"Phone", f.getPhone() != null ? f.getPhone() : "—"},});
    }

    public byte[] generateMyStudentIdCard(String userEmail) {
        StudentProfile s = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        return generateStudentIdCard(s.getId());
    }

    // ── Certificates ─────────────────────────────────────────────────────
    @Transactional
    public IssuedCertificateResponse issueCertificate(IssueCertificateRequest req, String adminEmail) {
        StudentProfile student = studentRepo.findById(req.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        User admin = userRepo.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        IssuedCertificate saved = certificateRepo.save(IssuedCertificate.builder()
                .certificateNumber(generateCertificateNumber(req.getType()))
                .type(req.getType())
                .student(student)
                .purpose(req.getPurpose())
                .issuedBy(admin)
                .build());

        return toResponse(saved);
    }

    public byte[] downloadCertificate(UUID certificateId) {
        IssuedCertificate c = certificateRepo.findById(certificateId)
                .orElseThrow(() -> new IllegalArgumentException("Certificate not found"));
        return buildCertificatePdf(c);
    }

    public Page<IssuedCertificateResponse> getAll(CertificateType type, String search, int page, int size) {
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return certificateRepo.search(type, q, PageRequest.of(page, size)).map(this::toResponse);
    }

    public Page<IssuedCertificateResponse> getMyCertificates(String userEmail, int page, int size) {
        StudentProfile student = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        return certificateRepo.findAllByStudentIdOrderByCreatedAtDesc(student.getId(), PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── PDF builders ─────────────────────────────────────────────────────
    private byte[] buildIdCard(String name, String roleLabel, String[][] fields) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Standard CR80 card size (3.375in × 2.125in) in points
            Document document = new Document(new com.lowagie.text.Rectangle(243f, 153f), 10, 10, 10, 10);
            PdfWriter.getInstance(document, out);
            document.open();

            Color brand = new Color(79, 70, 229); // indigo-600

            PdfPTable outer = new PdfPTable(1);
            outer.setWidthPercentage(100);

            // Header bar
            PdfPCell header = new PdfPCell(new Paragraph(COLLEGE_NAME,
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.BOLD, Color.WHITE)));
            header.setBackgroundColor(brand);
            header.setPadding(5);
            header.setHorizontalAlignment(Element.ALIGN_CENTER);
            header.setBorder(Rectangle.NO_BORDER);
            outer.addCell(header);

            PdfPCell roleCell = new PdfPCell(new Paragraph(roleLabel + " ID CARD",
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6, com.lowagie.text.Font.NORMAL, Color.WHITE)));
            roleCell.setBackgroundColor(brand);
            roleCell.setPaddingBottom(4);
            roleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            roleCell.setBorder(Rectangle.NO_BORDER);
            outer.addCell(roleCell);

            // Name
            PdfPCell nameCell = new PdfPCell(new Paragraph(name,
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.BOLD)));
            nameCell.setPaddingTop(8);
            nameCell.setPaddingBottom(4);
            nameCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            nameCell.setBorder(Rectangle.NO_BORDER);
            outer.addCell(nameCell);

            // Details table
            PdfPTable details = new PdfPTable(2);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{1.1f, 1.5f});
            com.lowagie.text.Font labelFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6.5f, com.lowagie.text.Font.BOLD, Color.GRAY);
            com.lowagie.text.Font valueFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 7, com.lowagie.text.Font.NORMAL);
            for (String[] field : fields) {
                PdfPCell label = new PdfPCell(new Paragraph(field[0], labelFont));
                label.setBorder(Rectangle.NO_BORDER);
                label.setPaddingBottom(2);
                details.addCell(label);

                PdfPCell value = new PdfPCell(new Paragraph(field[1], valueFont));
                value.setBorder(Rectangle.NO_BORDER);
                value.setPaddingBottom(2);
                details.addCell(value);
            }
            PdfPCell detailsWrapper = new PdfPCell(details);
            detailsWrapper.setBorder(Rectangle.NO_BORDER);
            detailsWrapper.setPadding(6);
            outer.addCell(detailsWrapper);

            // Footer
            PdfPCell footer = new PdfPCell(new Paragraph("Valid for current academic year only",
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 5.5f, com.lowagie.text.Font.ITALIC, Color.GRAY)));
            footer.setHorizontalAlignment(Element.ALIGN_CENTER);
            footer.setBorder(Rectangle.TOP);
            footer.setBorderColor(new Color(230, 230, 230));
            footer.setPaddingTop(4);
            outer.addCell(footer);

            document.add(outer);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate ID card", e);
        }
    }

    private byte[] buildCertificatePdf(IssuedCertificate c) {
        StudentProfile s = c.getStudent();
        String program = s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getName() : "—";
        String department = s.getCurrentSection() != null
                ? s.getCurrentSection().getSemester().getProgram().getDepartment().getName() : "—";
        String studentName = s.getUser().getFirstName() + " " + s.getUser().getLastName();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 60, 60, 50, 50);
            PdfWriter.getInstance(document, out);
            document.open();

            // Decorative border
            // (drawn via a full-page bordered table for simplicity with OpenPDF)
            com.lowagie.text.Font collegeFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD, new Color(79, 70, 229));
            Paragraph collegePara = new Paragraph(COLLEGE_NAME, collegeFont);
            collegePara.setAlignment(Element.ALIGN_CENTER);
            document.add(collegePara);

            com.lowagie.text.Font subFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.NORMAL, Color.GRAY);
            Paragraph subPara = new Paragraph("Office of the Registrar", subFont);
            subPara.setAlignment(Element.ALIGN_CENTER);
            subPara.setSpacingAfter(30);
            document.add(subPara);

            com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 16, com.lowagie.text.Font.BOLD);
            Paragraph titlePara = new Paragraph(c.getType().getDisplayName().toUpperCase(), titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingAfter(24);
            document.add(titlePara);

            com.lowagie.text.Font bodyFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.NORMAL);
            Paragraph body = new Paragraph(buildCertificateBody(c, studentName, program, department), bodyFont);
            body.setAlignment(Element.ALIGN_JUSTIFIED);
            body.setLeading(20f);
            body.setSpacingAfter(40);
            document.add(body);

            // Footer: date + certificate number (left), signature line (right)
            PdfPTable footerTable = new PdfPTable(2);
            footerTable.setWidthPercentage(100);
            footerTable.setSpacingBefore(40);

            com.lowagie.text.Font footerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.NORMAL);
            PdfPCell left = new PdfPCell(new Paragraph(
                    "Date: " + LocalDate.now().format(DATE_FMT)
                    + "\nCertificate No: " + c.getCertificateNumber(), footerFont));
            left.setBorder(Rectangle.NO_BORDER);
            footerTable.addCell(left);

            PdfPCell right = new PdfPCell(new Paragraph("\n\n_______________________\nRegistrar / Authorized Signatory", footerFont));
            right.setBorder(Rectangle.NO_BORDER);
            right.setHorizontalAlignment(Element.ALIGN_RIGHT);
            footerTable.addCell(right);

            document.add(footerTable);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate certificate PDF", e);
        }
    }

    private String buildCertificateBody(IssuedCertificate c, String studentName, String program, String department) {
        String purposeClause = (c.getPurpose() != null && !c.getPurpose().isBlank())
                ? " This certificate is being issued for the purpose of " + c.getPurpose() + "."
                : "";

        return switch (c.getType()) {
            case BONAFIDE ->
                "This is to certify that " + studentName + " (Enrollment No: "
                + c.getStudent().getEnrollmentNumber() + ") is a bonafide student of the "
                + department + " Department, pursuing " + program
                + " at " + COLLEGE_NAME + " during the academic year "
                + currentAcademicYear() + "." + purposeClause;

            case CHARACTER ->
                "This is to certify that " + studentName + " (Enrollment No: "
                + c.getStudent().getEnrollmentNumber() + "), a student of " + program
                + " in the " + department + " Department, has been a student of good moral "
                + "character during their tenure at " + COLLEGE_NAME
                + ". No disciplinary action has been recorded against them." + purposeClause;

            case TRANSFER ->
                studentName + " (Enrollment No: " + c.getStudent().getEnrollmentNumber()
                + "), a student of " + program + " in the " + department
                + " Department, is being relieved from " + COLLEGE_NAME
                + " and is granted this Transfer Certificate to seek admission elsewhere."
                + purposeClause;

            case COURSE_COMPLETION ->
                "This is to certify that " + studentName + " (Enrollment No: "
                + c.getStudent().getEnrollmentNumber() + ") has successfully completed the "
                + program + " programme offered by the " + department + " Department at "
                + COLLEGE_NAME + "." + purposeClause;
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private String generateCertificateNumber(CertificateType type) {
        String last = certificateRepo.findTopByTypeOrderByCreatedAtDesc(type)
                .map(IssuedCertificate::getCertificateNumber)
                .orElse(null);
        int next = 1;
        if (last != null) {
            try {
                next = Integer.parseInt(last.substring(last.lastIndexOf('/') + 1)) + 1;
            } catch (Exception ignored) {
            }
        }
        return type.getPrefix() + "/" + Year.now().getValue() + "/" + String.format("%05d", next);
    }

    private String currentAcademicYear() {
        int y = Year.now().getValue();
        return y + "-" + String.valueOf((y + 1) % 100);
    }

    private IssuedCertificateResponse toResponse(IssuedCertificate c) {
        return IssuedCertificateResponse.builder()
                .id(c.getId())
                .certificateNumber(c.getCertificateNumber())
                .type(c.getType().name())
                .typeDisplay(c.getType().getDisplayName())
                .studentName(c.getStudent().getUser().getFirstName() + " " + c.getStudent().getUser().getLastName())
                .enrollmentNumber(c.getStudent().getEnrollmentNumber())
                .purpose(c.getPurpose())
                .issuedByName(c.getIssuedBy().getFirstName() + " " + c.getIssuedBy().getLastName())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
