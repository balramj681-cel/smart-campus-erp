package com.smartcampus.erp.application.document.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.CertificateType;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class IssueCertificateRequest {
    @NotNull
    private UUID studentId;

    @NotNull
    private CertificateType type;

    private String purpose;
}