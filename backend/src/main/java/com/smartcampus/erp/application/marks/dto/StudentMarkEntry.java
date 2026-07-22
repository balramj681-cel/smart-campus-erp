package com.smartcampus.erp.application.marks.dto;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class StudentMarkEntry {
    private UUID    studentId;
    private Double  marksObtained;   // null = not entered
    private boolean absent;
    private String  remarks;
}