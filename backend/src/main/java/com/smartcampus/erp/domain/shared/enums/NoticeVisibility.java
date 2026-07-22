package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NoticeVisibility {
    ALL             ("Everyone"),
    STUDENTS_ONLY   ("Students Only"),
    FACULTY_ONLY    ("Faculty Only"),
    ADMIN_ONLY      ("Admins Only");

    private final String displayName;
}