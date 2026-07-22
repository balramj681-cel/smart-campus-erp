package com.smartcampus.erp.application.student.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AssignSectionRequest {
    @NotNull private UUID sectionId;
}