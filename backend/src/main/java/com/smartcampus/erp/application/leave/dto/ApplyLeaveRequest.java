package com.smartcampus.erp.application.leave.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.LeaveType;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ApplyLeaveRequest {

    @NotNull
    private LeaveType leaveType;

    @NotNull @FutureOrPresent
    private LocalDate startDate;

    @NotNull @FutureOrPresent
    private LocalDate endDate;

    @NotBlank @Size(max = 500)
    private String reason;
}