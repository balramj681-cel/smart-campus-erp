package com.smartcampus.erp.application.academic.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class SemesterResponse {
    private UUID    id;
    private int     semesterNumber;
    private String  name;
    private boolean active;
    private UUID    programId;
    private String  programName;
    private int     sectionCount;
}