package com.smartcampus.erp.application.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Role;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ProfileResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private Role role;
    private String photoUrl;
    private LocalDateTime joinedAt;
}