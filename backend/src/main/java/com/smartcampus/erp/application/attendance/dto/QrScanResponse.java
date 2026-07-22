package com.smartcampus.erp.application.attendance.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class QrScanResponse {
    private boolean success;
    private boolean alreadyMarked;
    private String message;
    private String subjectName;
}