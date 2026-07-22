package com.smartcampus.erp.application.course.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.SubjectType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateSubjectRequest {

    @NotBlank @Size(max = 20)
    private String code;

    @NotBlank @Size(max = 100)
    private String name;

    @Min(1) @Max(10)
    private int creditHours;

    @Min(1) @Max(20)
    private int weeklyHours;

    @NotNull
    private SubjectType type;

    @Size(max = 500)
    private String description;

    @NotNull
    private UUID semesterId;
}