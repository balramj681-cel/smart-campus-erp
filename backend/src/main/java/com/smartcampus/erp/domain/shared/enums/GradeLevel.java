package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GradeLevel {
    O  ("O",  10, 90),
    A_PLUS("A+",  9, 80),
    A  ("A",   8, 70),
    B_PLUS("B+",  7, 60),
    B  ("B",   6, 50),
    C  ("C",   5, 40),
    F  ("F",   0,  0);

    private final String letter;
    private final int    gradePoints;
    private final int    minPercentage;

    public static GradeLevel fromPercentage(double pct) {
        for (GradeLevel g : values()) {
            if (pct >= g.minPercentage) return g;
        }
        return F;
    }
}