package com.smartcampus.erp.application.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SendMessageRequest {
    @NotBlank
    @Size(max = 4000)
    private String content;
}