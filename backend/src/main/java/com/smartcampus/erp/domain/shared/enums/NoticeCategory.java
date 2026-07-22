package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NoticeCategory {
    GENERAL  ("General",   "📢"),
    ACADEMIC ("Academic",  "📚"),
    EXAM     ("Exam",      "📝"),
    FEE      ("Fee",       "💰"),
    EVENT    ("Event",     "🎉"),
    HOLIDAY  ("Holiday",   "🏖️"),
    URGENT   ("Urgent",    "🚨");

    private final String displayName;
    private final String emoji;
}