package com.smartcampus.erp.application.fee.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateFeeStructureRequest {
    @NotBlank private String name;
    @NotNull  private UUID   programId;
    @Min(2000)@Max(2100) private int batch;
    @NotBlank private String academicYear;
    @NotEmpty private List<FeeStructureItemRequest> items;
}