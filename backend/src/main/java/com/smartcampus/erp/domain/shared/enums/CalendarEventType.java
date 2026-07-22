package com.smartcampus.erp.domain.shared.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CalendarEventType {
    HOLIDAY         ("Holiday",          "#ef4444", "🏖️"),
    EXAM            ("Examination",      "#8b5cf6", "📝"),
    SEMESTER_START  ("Semester Start",   "#22c55e", "🎓"),
    SEMESTER_END    ("Semester End",     "#f97316", "🏁"),
    EVENT           ("College Event",    "#3b82f6", "🎉"),
    SPORTS          ("Sports",           "#06b6d4", "🏆"),
    CULTURAL        ("Cultural",         "#ec4899", "🎭"),
    GENERAL         ("General",          "#94a3b8", "📅");

    private final String displayName;
    private final String color;
    private final String emoji;
}