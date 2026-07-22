package com.smartcampus.erp.application.leave.dto;

import com.smartcampus.erp.domain.shared.enums.LeaveStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ReviewLeaveRequest {

    @NotNull
    private LeaveStatus status;

    private String remarks;
}