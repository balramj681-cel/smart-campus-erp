package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ExamStatus {
    SCHEDULED  ("Scheduled"),
    ONGOING    ("Ongoing"),
    COMPLETED  ("Completed"),
    POSTPONED  ("Postponed"),
    CANCELLED  ("Cancelled");

    private final String displayName;
}