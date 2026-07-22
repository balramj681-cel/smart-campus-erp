package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GrievanceCategory {
    ACADEMIC        ("Academic",        "📚"),
    EXAMINATION     ("Examination",     "📝"),
    FEE             ("Fee",             "💰"),
    LIBRARY         ("Library",         "📖"),
    FACULTY_CONDUCT ("Faculty Conduct", "🧑‍🏫"),
    INFRASTRUCTURE  ("Infrastructure",  "🏢"),
    HOSTEL          ("Hostel",          "🏠"),
    HARASSMENT      ("Harassment",      "🚫"),
    OTHER           ("Other",           "📌");

    private final String displayName;
    private final String emoji;
}