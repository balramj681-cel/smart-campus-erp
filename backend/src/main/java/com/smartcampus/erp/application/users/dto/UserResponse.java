package com.smartcampus.erp.application.users.dto;

import com.smartcampus.erp.domain.shared.enums.Role;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserResponse {
    private UUID          id;
    private String        firstName;
    private String        lastName;
    private String        email;
    private String        phoneNumber;
    private Role          role;
    private boolean       enabled;
    private boolean       accountLocked;
    private boolean       emailVerified;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean hasProfile;
}