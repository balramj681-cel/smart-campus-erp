package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BookIssueStatus {
    ISSUED   ("Issued",    "📗"),
    RETURNED ("Returned",  "✅"),
    OVERDUE  ("Overdue",   "⏰"),
    LOST     ("Lost",      "❌");

    private final String displayName;
    private final String emoji;
}