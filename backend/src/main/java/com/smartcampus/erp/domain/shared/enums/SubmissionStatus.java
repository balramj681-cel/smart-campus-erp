package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SubmissionStatus {
    SUBMITTED ("Submitted",     "📤"),
    LATE      ("Late Submission", "⏰"),
    GRADED    ("Graded",        "✅");

    private final String displayName;
    private final String emoji;
}