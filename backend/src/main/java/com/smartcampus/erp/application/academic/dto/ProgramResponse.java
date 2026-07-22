package com.smartcampus.erp.application.academic.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.DegreeType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ProgramResponse {
    private UUID          id;
    private String        name;
    private String        code;
    private DegreeType    degree;
    private int           durationYears;
    private boolean       active;
    private UUID          departmentId;
    private String        departmentName;
    private int           semesterCount;
    private LocalDateTime createdAt;
}