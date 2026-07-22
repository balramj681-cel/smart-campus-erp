package com.smartcampus.erp.application.fee.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.FeeStatus;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class StudentFeeRecordResponse {
    private UUID      id;
    private FeeStatus status;
    private double    totalAmount;
    private double    paidAmount;
    private double    dueAmount;
    private String    remarks;

    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;
    private int    batch;

    private UUID   feeStructureId;
    private String feeStructureName;
    private String academicYear;
    private String programName;

    private LocalDateTime createdAt;
}