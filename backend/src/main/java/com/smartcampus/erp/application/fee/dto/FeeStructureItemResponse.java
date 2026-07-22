package com.smartcampus.erp.application.fee.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.FeeCategory;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class FeeStructureItemResponse {
    private UUID        id;
    private FeeCategory category;
    private String      categoryDisplay;
    private double      amount;
    private LocalDate   dueDate;
    private String      description;
}