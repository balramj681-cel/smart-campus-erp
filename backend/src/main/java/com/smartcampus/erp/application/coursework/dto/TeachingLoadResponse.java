package com.smartcampus.erp.application.coursework.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class TeachingLoadResponse {
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private UUID   sectionId;
    private String sectionName;
}