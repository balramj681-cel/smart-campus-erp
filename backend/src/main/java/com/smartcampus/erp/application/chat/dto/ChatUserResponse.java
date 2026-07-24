package com.smartcampus.erp.application.chat.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

/** Directory search result — "naya chat start karo" list ke liye. */
@Getter @Builder
public class ChatUserResponse {
    private UUID id;
    private String name;
    private String email;
    private String role;
    private String photoUrl;
}