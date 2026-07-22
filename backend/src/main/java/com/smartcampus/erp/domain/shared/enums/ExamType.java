package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ExamType {
    INTERNAL_1  ("Internal 1",  30),
    INTERNAL_2  ("Internal 2",  30),
    MID_TERM    ("Mid Term",    50),
    END_TERM    ("End Term",   100),
    PRACTICAL   ("Practical",   50),
    ASSIGNMENT  ("Assignment",  20),
    PROJECT     ("Project",     50);

    private final String displayName;
    private final int    defaultMaxMarks;
}