package com.smartcampus.erp.application.marks.dto;

import com.smartcampus.erp.domain.shared.enums.ExamType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ComponentMarkDto {
    private String  componentId;
    private ExamType examType;
    private String  examTypeDisplay;
    private int     maxMarks;
    private double  weightage;
    private Double  marksObtained;
    private boolean absent;
    private double  contributionToTotal;  // (marks/maxMarks) * weightage
}