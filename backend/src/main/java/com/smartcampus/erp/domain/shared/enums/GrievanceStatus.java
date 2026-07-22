package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GrievanceStatus {
    PENDING     ("Pending",     "⏳"),
    IN_PROGRESS ("In Progress", "🔄"),
    RESOLVED    ("Resolved",    "✅"),
    REJECTED    ("Rejected",    "❌");

    private final String displayName;
    private final String emoji;
}