package com.smartcampus.erp.application.notice.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.NoticeCategory;
import com.smartcampus.erp.domain.shared.enums.NoticeVisibility;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class NoticeResponse {
    private UUID             id;
    private String           title;
    private String           content;
    private NoticeCategory   category;
    private String           categoryDisplay;
    private String           categoryEmoji;
    private NoticeVisibility visibility;
    private String           visibilityDisplay;

    private UUID   postedById;
    private String postedByName;
    private String postedByRole;

    private UUID   targetDepartmentId;
    private String targetDepartmentName;

    private boolean   pinned;
    private boolean   active;
    private boolean   expired;
    private LocalDate expiresAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}