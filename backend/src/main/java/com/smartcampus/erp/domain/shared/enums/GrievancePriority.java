package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GrievancePriority {
    LOW    ("Low",    "🟢"),
    MEDIUM ("Medium", "🟡"),
    HIGH   ("High",   "🟠"),
    URGENT ("Urgent", "🔴");

    private final String displayName;
    private final String emoji;
}