package com.smartcampus.erp.application.timetable.dto;

import java.time.LocalTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.WeekDay;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.Builder;

@Getter @Setter
public class CreateTimetableEntryRequest {

    @NotNull  private UUID      sectionId;
    @NotNull  private UUID      subjectId;
    @NotNull  private UUID      facultyId;
    @NotNull  private WeekDay   dayOfWeek;

    @Min(1) @Max(8)
    private int periodNumber;

    @NotNull  private LocalTime startTime;
    @NotNull  private LocalTime endTime;

    private String roomNumber;

    @NotBlank private String academicYear;

    // null = recurring every week, date set = only for this week
    private java.time.LocalDate weekOf;

    @Builder.Default
    private boolean recurring = true;   // UI convenience field
}