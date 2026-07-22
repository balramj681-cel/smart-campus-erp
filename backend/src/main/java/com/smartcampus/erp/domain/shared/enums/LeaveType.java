package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LeaveType {
    CASUAL ("Casual Leave", "🏖️"),
    SICK   ("Sick Leave",   "🤒"),
    EARNED ("Earned Leave", "📅"),
    OTHER  ("Other",        "📝");

    private final String displayName;
    private final String emoji;
}