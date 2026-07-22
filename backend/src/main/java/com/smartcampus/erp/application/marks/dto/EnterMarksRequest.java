package com.smartcampus.erp.application.marks.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class EnterMarksRequest {
    @NotNull  private UUID                   componentId;
    @NotEmpty private List<StudentMarkEntry> entries;
}