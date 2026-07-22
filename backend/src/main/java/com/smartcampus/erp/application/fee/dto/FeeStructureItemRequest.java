package com.smartcampus.erp.application.fee.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.FeeCategory;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class FeeStructureItemRequest {
    @NotNull  private FeeCategory category;
    @Min(1)   private double      amount;
              private LocalDate   dueDate;
              private String      description;
}