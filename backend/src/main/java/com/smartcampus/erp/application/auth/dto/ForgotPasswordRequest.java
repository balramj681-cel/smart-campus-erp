package com.smartcampus.erp.application.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Request body for POST /api/auth/forgot-password
 *
 * <p>User sirf apna registered email deta hai. Backend check karta hai
 * ki account exist karta hai ya nahi, phir OTP bhejta hai.</p>
 */
@Getter
@NoArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;
}