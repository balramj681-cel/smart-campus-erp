package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LeaveStatus {
    PENDING   ("Pending",   "⏳"),
    APPROVED  ("Approved",  "✅"),
    REJECTED  ("Rejected",  "❌"),
    CANCELLED ("Cancelled", "🚫");

    private final String displayName;
    private final String emoji;
}