package com.smartcampus.erp.application.leave.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.LeaveStatus;
import com.smartcampus.erp.domain.shared.enums.LeaveType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class LeaveRequestResponse {
    private UUID id;

    private UUID   facultyId;
    private String facultyName;
    private String employeeId;
    private String departmentName;

    private LeaveType leaveType;
    private String     leaveTypeDisplay;
    private String     leaveTypeEmoji;

    private LocalDate startDate;
    private LocalDate endDate;
    private long       durationDays;
    private String     reason;

    private LeaveStatus status;
    private String       statusDisplay;
    private String       statusEmoji;

    private String        reviewedByName;
    private String         reviewRemarks;
    private LocalDateTime  reviewedAt;

    private LocalDateTime appliedAt;
}