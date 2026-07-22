package com.smartcampus.erp.application.notice.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.NoticeCategory;
import com.smartcampus.erp.domain.shared.enums.NoticeVisibility;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateNoticeRequest {

    @NotBlank @Size(max = 200)
    private String title;

    @NotBlank
    private String content;

    @NotNull
    private NoticeCategory category;

    @NotNull
    private NoticeVisibility visibility;

    private UUID      targetDepartmentId;
    private String    targetDepartmentName;
    private boolean   pinned;
    private LocalDate expiresAt;
}