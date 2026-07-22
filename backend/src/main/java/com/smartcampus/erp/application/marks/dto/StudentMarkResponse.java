package com.smartcampus.erp.application.marks.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class StudentMarkResponse {
    private UUID   markId;
    private UUID   studentId;
    private String studentName;
    private String enrollmentNumber;
    private Double marksObtained;
    private int    maxMarks;
    private boolean absent;
    private double  percentage;
    private String  remarks;
}