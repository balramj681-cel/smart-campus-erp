package com.smartcampus.erp.application.academic.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SectionResponse {
    private UUID   id;
    private String name;
    private int    maxCapacity;
    private int    currentStrength;
    private boolean active;
    private UUID   semesterId;
    private String semesterName;
    private String programName;
    private String departmentName;
}