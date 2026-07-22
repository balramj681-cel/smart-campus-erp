package com.smartcampus.erp.application.grievance.dto;

import com.smartcampus.erp.domain.shared.enums.GrievanceCategory;
import com.smartcampus.erp.domain.shared.enums.GrievancePriority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateGrievanceRequest {

    @NotBlank @Size(max = 200)
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private GrievanceCategory category;

    private GrievancePriority priority;

    private boolean anonymous;
}