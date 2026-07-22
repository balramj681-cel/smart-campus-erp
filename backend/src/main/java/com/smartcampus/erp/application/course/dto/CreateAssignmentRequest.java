package com.smartcampus.erp.application.course.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateAssignmentRequest {

    @NotNull
    private UUID facultyId;

    @NotNull
    private UUID subjectId;

    @NotNull
    private UUID sectionId;

    @NotBlank
    private String academicYear;   // e.g. "2024-25"
}