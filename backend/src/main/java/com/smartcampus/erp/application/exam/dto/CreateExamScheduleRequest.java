package com.smartcampus.erp.application.exam.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.ExamType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateExamScheduleRequest {
    @NotNull  private UUID      sectionId;
    @NotNull  private UUID      subjectId;
    @NotNull  private ExamType  examType;
    @NotNull  private LocalDate examDate;
    @NotNull  private LocalTime startTime;
    @NotNull  private LocalTime endTime;
              private String    venue;
    @NotBlank private String    academicYear;
              private String    instructions;
}