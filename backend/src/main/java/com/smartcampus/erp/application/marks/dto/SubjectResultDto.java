package com.smartcampus.erp.application.marks.dto;

import com.smartcampus.erp.domain.shared.enums.GradeLevel;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter @Builder
public class SubjectResultDto {
    private UUID   subjectId;
    private String subjectCode;
    private String subjectName;
    private int    creditHours;

    private List<ComponentMarkDto> components;

    private double  totalWeightedMarks;   // out of 100
    private GradeLevel grade;
    private String  gradeLetter;
    private int     gradePoints;
    private double  gradePointsEarned;    // gradePoints * creditHours
}