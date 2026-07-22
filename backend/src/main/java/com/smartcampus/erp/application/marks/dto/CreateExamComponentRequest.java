package com.smartcampus.erp.application.marks.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.ExamType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateExamComponentRequest {
    @NotNull  private UUID      sectionId;
    @NotNull  private UUID      subjectId;
              private UUID      facultyId;
    @NotNull  private ExamType  examType;
    @Min(1) @Max(200)
              private int       maxMarks;
    @DecimalMin("0") @DecimalMax("100")
              private double    weightage;
    @NotBlank private String    academicYear;
              private LocalDate scheduledDate;
}