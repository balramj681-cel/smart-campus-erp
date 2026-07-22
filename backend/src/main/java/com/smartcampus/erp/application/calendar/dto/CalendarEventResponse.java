package com.smartcampus.erp.application.calendar.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.CalendarEventType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class CalendarEventResponse {
    private UUID              id;
    private String            title;
    private String            description;
    private CalendarEventType eventType;
    private String            eventTypeDisplay;
    private String            color;
    private String            emoji;
    private LocalDate         startDate;
    private LocalDate         endDate;
    private boolean           multiDay;
    private int               durationDays;
    private String            academicYear;
    private boolean           published;
    private boolean           isHoliday;
    private String            createdByName;
    private LocalDateTime     createdAt;
}