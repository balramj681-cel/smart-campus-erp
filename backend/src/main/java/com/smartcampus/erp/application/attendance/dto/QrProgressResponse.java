package com.smartcampus.erp.application.attendance.dto;

import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class QrProgressResponse {
    private UUID sessionId;
    private boolean active;          // qrToken abhi bhi valid hai ya finalize ho chuka
    private int totalStudents;
    private int scannedCount;
    private List<String> scannedStudentNames;
}