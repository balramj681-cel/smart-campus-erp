package com.smartcampus.erp.application.chat.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ConversationResponse {
    private UUID id;
    private UUID otherUserId;
    private String otherUserName;
    private String otherUserEmail;
    private String otherUserRole;
    private String lastMessagePreview;
    private LocalDateTime lastMessageAt;
    private long unreadCount;
}