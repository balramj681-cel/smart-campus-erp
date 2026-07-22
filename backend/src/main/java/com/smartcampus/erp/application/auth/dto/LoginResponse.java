package com.smartcampus.erp.application.auth.dto;

import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Role;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private UUID userId;

    private String firstName;

    private String lastName;

    private String email;

    private Role role;

    private String accessToken;

    private String refreshToken;

    private String tokenType;

    private UUID facultyProfileId;
    private UUID studentProfileId;
    private String photoUrl;
}