package com.smartcampus.erp.application.attendance.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class AttendanceRecordResponse {
    private UUID             recordId;
    private UUID             studentId;
    private String           studentName;
    private String           enrollmentNumber;
    private AttendanceStatus status;
    private String           remarks;
}