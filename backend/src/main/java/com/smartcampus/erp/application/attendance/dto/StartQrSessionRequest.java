package com.smartcampus.erp.application.attendance.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class StartQrSessionRequest {
    @NotNull private UUID sectionId;
    @NotNull private UUID subjectId;
    @NotNull private LocalDate sessionDate;
    @NotNull private String academicYear;
    @NotNull private Integer periodNumber;
    private String remarks;

    // Kitne minute tak QR valid rahega — default 10
    private Integer validityMinutes;
}