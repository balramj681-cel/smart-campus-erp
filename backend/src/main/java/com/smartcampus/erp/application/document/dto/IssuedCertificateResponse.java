package com.smartcampus.erp.application.document.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class IssuedCertificateResponse {
    private UUID id;
    private String certificateNumber;
    private String type;
    private String typeDisplay;
    private String studentName;
    private String enrollmentNumber;
    private String purpose;
    private String issuedByName;
    private LocalDateTime createdAt;
}