package com.smartcampus.erp.application.fee.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.fee.dto.AssignFeeRequest;
import com.smartcampus.erp.application.fee.dto.CreateFeeStructureRequest;
import com.smartcampus.erp.application.fee.dto.FeePaymentResponse;
import com.smartcampus.erp.application.fee.dto.FeeStructureItemRequest;
import com.smartcampus.erp.application.fee.dto.FeeStructureItemResponse;
import com.smartcampus.erp.application.fee.dto.FeeStructureResponse;
import com.smartcampus.erp.application.fee.dto.RecordPaymentRequest;
import com.smartcampus.erp.application.fee.dto.StudentFeeRecordResponse;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.Program;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.fee.FeePayment;
import com.smartcampus.erp.domain.fee.FeeStructure;
import com.smartcampus.erp.domain.fee.FeeStructureItem;
import com.smartcampus.erp.domain.fee.StudentFeeRecord;
import com.smartcampus.erp.domain.shared.enums.FeeStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ProgramRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.FeePaymentRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.FeeStructureRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.StudentFeeRecordRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FeeService {

    private final FeeStructureRepository    structureRepo;
    private final StudentFeeRecordRepository recordRepo;
    private final FeePaymentRepository      paymentRepo;
    private final ProgramRepository         programRepo;
    private final StudentProfileRepository  studentRepo;
    private final NotificationService       notificationService;

    // ── Fee Structures ────────────────────────────────────────────────────

    public List<FeeStructureResponse> getAllStructures() {
        return structureRepo.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toStructureResponse).toList();
    }

    public FeeStructureResponse getStructureById(UUID id) {
        return toStructureResponse(findStructureOrThrow(id));
    }

    @Transactional
    public FeeStructureResponse createStructure(CreateFeeStructureRequest req) {
        if (structureRepo.existsByProgramIdAndBatchAndAcademicYear(
                req.getProgramId(), req.getBatch(), req.getAcademicYear())) {
            throw new IllegalArgumentException(
                "Fee structure for this program/batch/year already exists.");
        }

        Program program = programRepo.findById(req.getProgramId())
                .orElseThrow(() -> new IllegalArgumentException("Program not found"));

        FeeStructure structure = structureRepo.save(FeeStructure.builder()
                .name(req.getName()).program(program)
                .batch(req.getBatch()).academicYear(req.getAcademicYear())
                .build());

        double total = 0;
        for (FeeStructureItemRequest item : req.getItems()) {
            structure.getItems().add(FeeStructureItem.builder()
                    .feeStructure(structure)
                    .category(item.getCategory())
                    .amount(item.getAmount())
                    .dueDate(item.getDueDate())
                    .description(item.getDescription())
                    .build());
            total += item.getAmount();
        }

        return toStructureResponse(structureRepo.save(structure));
    }

    @Transactional
    public void deleteStructure(UUID id) {
        structureRepo.deleteById(id);
    }

    // ── Assign fee to student(s) ──────────────────────────────────────────

    @Transactional
    public int assignFee(AssignFeeRequest req) {
        FeeStructure structure = findStructureOrThrow(req.getFeeStructureId());
        double total = structure.getItems().stream().mapToDouble(FeeStructureItem::getAmount).sum();
        int count = 0;

        if (req.getStudentId() != null) {
            // Assign to single student
            assignToStudent(req.getStudentId(), structure, total);
            count = 1;
        } else {
            // Assign to all students of that batch who match the program
            List<StudentProfile> students = studentRepo.findAll().stream()
                    .filter(s -> s.getBatch() == structure.getBatch()
                            && s.getCurrentSection() != null
                            && s.getCurrentSection().getSemester().getProgram()
                                   .getId().equals(structure.getProgram().getId()))
                    .toList();

            for (StudentProfile student : students) {
                boolean alreadyAssigned = recordRepo
                        .findByStudentIdAndFeeStructureId(student.getId(), structure.getId())
                        .isPresent();
                if (!alreadyAssigned) {
                    assignToStudent(student.getId(), structure, total);
                    count++;
                }
            }
        }
        return count;
    }

    private void assignToStudent(UUID studentId, FeeStructure structure, double total) {
        StudentProfile student = studentRepo.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

        boolean exists = recordRepo
                .findByStudentIdAndFeeStructureId(studentId, structure.getId())
                .isPresent();
        if (exists) return;

        recordRepo.save(StudentFeeRecord.builder()
                .student(student).feeStructure(structure)
                .totalAmount(total).build());

        notificationService.pushToUser(
                student.getUser(),
                "Fee Assigned",
                structure.getName() + " has been assigned to you. Amount due: ₹" + total + ".",
                NotificationType.FEE,
                structure.getId());
    }

    // ── Student Fee Records ───────────────────────────────────────────────

    public Page<StudentFeeRecordResponse> getRecords(
            UUID structureId, FeeStatus status, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return recordRepo.search(structureId, status, q, pageable).map(this::toRecordResponse);
    }

    public StudentFeeRecordResponse getRecord(UUID id) {
        return toRecordResponse(findRecordOrThrow(id));
    }

    // ── Record Payment ────────────────────────────────────────────────────

    @Transactional
    public FeePaymentResponse recordPayment(RecordPaymentRequest req) {
        StudentFeeRecord record = findRecordOrThrow(req.getStudentFeeRecordId());

        double due = record.getDueAmount();
        if (req.getAmount() > due + 0.01) {
            throw new IllegalArgumentException(
                String.format("Payment amount (₹%.2f) exceeds due amount (₹%.2f).", req.getAmount(), due));
        }

        String receiptNo = generateReceiptNumber();

        FeePayment payment = paymentRepo.save(FeePayment.builder()
                .studentFeeRecord(record)
                .amount(req.getAmount())
                .paymentDate(req.getPaymentDate())
                .paymentMode(req.getPaymentMode())
                .transactionId(req.getTransactionId())
                .remarks(req.getRemarks())
                .receiptNumber(receiptNo)
                .build());

        // Update paid amount + status
        record.setPaidAmount(record.getPaidAmount() + req.getAmount());
        double remaining = record.getDueAmount();
        if (remaining <= 0.01) {
            record.setStatus(FeeStatus.PAID);
        } else if (record.getPaidAmount() > 0) {
            record.setStatus(FeeStatus.PARTIAL);
        }
        recordRepo.save(record);

        return toPaymentResponse(payment);
    }

    // ── Payment History ───────────────────────────────────────────────────

    public List<FeePaymentResponse> getPayments(UUID studentFeeRecordId) {
        return paymentRepo
                .findAllByStudentFeeRecordIdOrderByPaymentDateDesc(studentFeeRecordId)
                .stream().map(this::toPaymentResponse).toList();
    }

    @Transactional
    public void deletePayment(UUID paymentId) {
        FeePayment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        StudentFeeRecord record = payment.getStudentFeeRecord();
        record.setPaidAmount(Math.max(0, record.getPaidAmount() - payment.getAmount()));

        // Recompute status
        if (record.getPaidAmount() <= 0) {
            record.setStatus(isOverdue(record) ? FeeStatus.OVERDUE : FeeStatus.PENDING);
        } else {
            record.setStatus(FeeStatus.PARTIAL);
        }
        recordRepo.save(record);
        paymentRepo.delete(payment);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean isOverdue(StudentFeeRecord record) {
        return record.getFeeStructure().getItems().stream()
                .anyMatch(item -> item.getDueDate() != null
                        && item.getDueDate().isBefore(LocalDate.now()));
    }

    private String generateReceiptNumber() {
        String max = paymentRepo.findMaxReceiptNumber();
        int next = 1;
        if (max != null) {
            try { next = Integer.parseInt(max.replaceAll("[^0-9]", "")) + 1; }
            catch (NumberFormatException ignored) {}
        }
        return String.format("RCP%07d", next);
    }

    private FeeStructure findStructureOrThrow(UUID id) {
        return structureRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fee structure not found: " + id));
    }

    private StudentFeeRecord findRecordOrThrow(UUID id) {
        return recordRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fee record not found: " + id));
    }

    private FeeStructureResponse toStructureResponse(FeeStructure s) {
        double total = s.getItems().stream().mapToDouble(FeeStructureItem::getAmount).sum();
        long   totalStu  = recordRepo.countByFeeStructureIdAndStatus(s.getId(), null) +
                           recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PAID) +
                           recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PARTIAL) +
                           recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PENDING) +
                           recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.OVERDUE);
        long   paidCount  = recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PAID);
        Double collected  = recordRepo.sumPaidByStructure(s.getId());

        return FeeStructureResponse.builder()
                .id(s.getId()).name(s.getName()).batch(s.getBatch())
                .academicYear(s.getAcademicYear()).active(s.isActive())
                .programId(s.getProgram().getId()).programName(s.getProgram().getName())
                .departmentName(s.getProgram().getDepartment().getName())
                .totalAmount(total)
                .items(s.getItems().stream().map(this::toItemResponse).toList())
                .totalStudents(recordRepo.findAllByFeeStructureId(s.getId()).size())
                .paidCount(paidCount)
                .pendingCount(recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PENDING)
                            + recordRepo.countByFeeStructureIdAndStatus(s.getId(), FeeStatus.PARTIAL))
                .collectedAmount(collected != null ? collected : 0)
                .createdAt(s.getCreatedAt())
                .build();
    }

    private FeeStructureItemResponse toItemResponse(FeeStructureItem i) {
        return FeeStructureItemResponse.builder()
                .id(i.getId()).category(i.getCategory())
                .categoryDisplay(i.getCategory().getDisplayName())
                .amount(i.getAmount()).dueDate(i.getDueDate())
                .description(i.getDescription()).build();
    }

    private StudentFeeRecordResponse toRecordResponse(StudentFeeRecord r) {
        StudentProfile s = r.getStudent();
        return StudentFeeRecordResponse.builder()
                .id(r.getId()).status(r.getStatus())
                .totalAmount(r.getTotalAmount()).paidAmount(r.getPaidAmount())
                .dueAmount(r.getDueAmount()).remarks(r.getRemarks())
                .studentId(s.getId())
                .studentName(s.getUser().getFirstName() + " " + s.getUser().getLastName())
                .enrollmentNumber(s.getEnrollmentNumber()).batch(s.getBatch())
                .feeStructureId(r.getFeeStructure().getId())
                .feeStructureName(r.getFeeStructure().getName())
                .academicYear(r.getFeeStructure().getAcademicYear())
                .programName(r.getFeeStructure().getProgram().getName())
                .createdAt(r.getCreatedAt()).build();
    }

    private FeePaymentResponse toPaymentResponse(FeePayment p) {
        return FeePaymentResponse.builder()
                .id(p.getId()).amount(p.getAmount())
                .paymentDate(p.getPaymentDate()).paymentMode(p.getPaymentMode())
                .paymentModeDisplay(p.getPaymentMode().getDisplayName())
                .transactionId(p.getTransactionId())
                .receiptNumber(p.getReceiptNumber())
                .remarks(p.getRemarks()).createdAt(p.getCreatedAt()).build();
    }

    public List<StudentFeeRecordResponse> getRecordsForStudent(UUID studentId) {
        return recordRepo.findAllByStudentId(studentId)
                .stream().map(this::toRecordResponse).toList();
    }
}