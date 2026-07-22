package com.smartcampus.erp.application.timetable.dto;

import java.time.LocalTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.WeekDay;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class TimetableEntryResponse {

    private UUID      id;
    private String    academicYear;
    private WeekDay   dayOfWeek;
    private String    dayDisplayName;
    private int       periodNumber;
    private LocalTime startTime;
    private LocalTime endTime;
    private String    roomNumber;
    private boolean   active;

    // Subject
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private String subjectType;

    // Faculty
    private UUID   facultyId;
    private String facultyName;
    private String facultyEmployeeId;

    // Section → Semester → Program → Department
    private UUID   sectionId;
    private String sectionName;
    private UUID   semesterId;
    private String semesterName;
    private String programName;
    private String departmentName;
    private java.time.LocalDate weekOf;
    private boolean recurring;  // weekOf == null

    // Only meaningful for a date-specific lookup (getForDate) — true if the
    // assigned faculty has an approved leave covering that exact date, so
    // the frontend can show "Class cancelled — faculty on leave" instead
    // of a normal scheduled period.
    private boolean facultyOnLeave;

    private boolean cancelled;
}