package com.smartcampus.erp.application.notification.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.NotificationType;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class NotificationResponse {
    private UUID   id;
    private String title;
    private String message;
    private NotificationType type;
    private String typeDisplay;
    private String typeEmoji;
    private UUID   referenceId;
    private boolean read;
    private LocalDateTime createdAt;
}