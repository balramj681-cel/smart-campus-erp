package com.smartcampus.erp.application.grievance.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.GrievanceStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateGrievanceStatusRequest {

    @NotNull
    private GrievanceStatus status;

    private UUID   assignedToId;
    private String resolutionRemarks;
}