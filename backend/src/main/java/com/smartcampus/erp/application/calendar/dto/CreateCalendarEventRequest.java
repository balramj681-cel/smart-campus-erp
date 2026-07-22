package com.smartcampus.erp.application.calendar.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.CalendarEventType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateCalendarEventRequest {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    private CalendarEventType eventType;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private String  academicYear;
    private boolean published;
    private boolean isHoliday;
}