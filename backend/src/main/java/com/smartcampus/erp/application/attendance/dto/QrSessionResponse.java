package com.smartcampus.erp.application.attendance.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class QrSessionResponse {
    private UUID sessionId;
    private String qrToken;
    private LocalDateTime qrExpiresAt;
    private String subjectName;
    private String sectionName;
}