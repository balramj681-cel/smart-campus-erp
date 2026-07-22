package com.smartcampus.erp.application.academic.dto;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateSectionRequest {
    @NotNull
    private UUID semesterId;

    @NotBlank @Size(max = 10)
    private String name;

    @Min(10) @Max(200)
    private int maxCapacity;
}