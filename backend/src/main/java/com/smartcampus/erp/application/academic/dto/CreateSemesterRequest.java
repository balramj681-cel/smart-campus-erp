package com.smartcampus.erp.application.academic.dto;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateSemesterRequest {
    @NotNull
    private UUID programId;

    @Min(1) @Max(12)
    private int semesterNumber;

    @NotBlank
    private String name;
}