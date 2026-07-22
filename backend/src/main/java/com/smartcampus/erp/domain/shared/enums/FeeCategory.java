package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FeeCategory {
    TUITION        ("Tuition Fee"),
    HOSTEL         ("Hostel Fee"),
    EXAM           ("Examination Fee"),
    LIBRARY        ("Library Fee"),
    SPORTS         ("Sports Fee"),
    DEVELOPMENT    ("Development Fee"),
    LABORATORY     ("Laboratory Fee"),
    TRANSPORT      ("Transport Fee"),
    MISCELLANEOUS  ("Miscellaneous");

    private final String displayName;
}