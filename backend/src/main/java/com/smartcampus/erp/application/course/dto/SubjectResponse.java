package com.smartcampus.erp.application.course.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.SubjectType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SubjectResponse {
    private UUID        id;
    private String      code;
    private String      name;
    private int         creditHours;
    private int         weeklyHours;
    private SubjectType type;
    private String      description;
    private boolean     active;

    // Semester → Program → Department chain
    private UUID   semesterId;
    private String semesterName;
    private UUID   programId;
    private String programName;
    private UUID   departmentId;
    private String departmentName;

    private LocalDateTime createdAt;
}