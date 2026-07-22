package com.smartcampus.erp.application.attendance.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class MarkStudentRequest {
    @NotNull private UUID             studentId;
    @NotNull private AttendanceStatus status;
    private          String           remarks;
}