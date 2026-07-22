package com.smartcampus.erp.application.course.dto;

import com.smartcampus.erp.domain.shared.enums.SubjectType;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateSubjectRequest {
    private String      name;
    private Integer     creditHours;
    private Integer     weeklyHours;
    private SubjectType type;
    private String      description;
}