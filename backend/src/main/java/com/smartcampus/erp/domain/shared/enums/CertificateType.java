package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CertificateType {
    BONAFIDE          ("BON", "Bonafide Certificate"),
    CHARACTER         ("CHA", "Character Certificate"),
    TRANSFER          ("TRF", "Transfer Certificate"),
    COURSE_COMPLETION ("COC", "Course Completion Certificate");

    private final String prefix;
    private final String displayName;
}