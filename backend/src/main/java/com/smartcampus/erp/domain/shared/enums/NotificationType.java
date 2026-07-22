package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NotificationType {
    NOTICE      ("Notice",      "📢"),
    LIBRARY     ("Library",     "📚"),
    FEE         ("Fee",         "💰"),
    ATTENDANCE  ("Attendance",  "🗓️"),
    EXAM        ("Exam",        "📝"),
    ASSIGNMENT  ("Assignment",  "📄"),
    GRIEVANCE   ("Grievance",   "📮"),
    GENERAL     ("General",     "🔔");

    private final String displayName;
    private final String emoji;
}