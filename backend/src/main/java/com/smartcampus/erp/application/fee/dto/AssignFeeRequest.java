package com.smartcampus.erp.application.fee.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AssignFeeRequest {
    @NotNull private UUID feeStructureId;
    // If studentId is null → assign to ALL students in the batch
    private UUID studentId;
}