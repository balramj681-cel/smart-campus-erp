package com.smartcampus.erp.application.attendance.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateAttendanceSessionRequest {
    @NotNull  private UUID        sectionId;
    @NotNull  private UUID        subjectId;
              private UUID        facultyId;
    @NotNull  private LocalDate   sessionDate;
    @NotBlank private String      academicYear;
    @NotNull  private Integer     periodNumber;
    private          String       remarks;

    @NotEmpty
    private List<MarkStudentRequest> records;
}