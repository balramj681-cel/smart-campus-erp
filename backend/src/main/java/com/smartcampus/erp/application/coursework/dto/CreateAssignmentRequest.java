package com.smartcampus.erp.application.coursework.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateAssignmentRequest {

    @NotNull
    private UUID subjectId;

    @NotNull
    private UUID sectionId;

    // Optional — resolved from the authenticated faculty if omitted.
    private UUID facultyId;

    @NotBlank
    private String title;

    private String description;

    @NotNull @Future
    private LocalDateTime dueDate;

    private Integer maxMarks;

    @NotBlank
    private String academicYear;
}