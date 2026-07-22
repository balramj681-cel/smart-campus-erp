package com.smartcampus.erp.application.academic.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.DegreeType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateProgramRequest {

    @NotBlank @Size(max = 100)
    private String name;

    @NotBlank @Size(max = 20)
    private String code;

    @NotNull
    private DegreeType degree;

    @Min(1) @Max(6)
    private int durationYears;

    @NotNull
    private UUID departmentId;
}