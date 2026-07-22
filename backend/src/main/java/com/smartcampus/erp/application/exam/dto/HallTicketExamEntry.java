package com.smartcampus.erp.application.exam.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.ExamType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class HallTicketExamEntry {
    private UUID      examScheduleId;
    private String    subjectCode;
    private String    subjectName;
    private int       creditHours;
    private ExamType  examType;
    private String    examTypeDisplay;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String    venue;
    private String    statusDisplay;
}