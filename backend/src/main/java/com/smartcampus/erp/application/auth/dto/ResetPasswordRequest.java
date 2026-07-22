package com.smartcampus.erp.application.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Request body for POST /api/auth/reset-password
 *
 * <p>Teen cheezein ek saath aati hain:</p>
 * <ol>
 *   <li>{@code email}      — user ka registered email</li>
 *   <li>{@code otpCode}    — email pe aaya 6-digit OTP</li>
 *   <li>{@code newPassword}— jo naya password set karna hai</li>
 * </ol>
 *
 * <p>OTP aur new password ek hi request mein isliye bheja jaata hai
 * taaki do separate round-trips na karni padein. OTP verify hota hai,
 * password reset hota hai — sab ek atomic operation mein.</p>
 */
@Getter
@NoArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "OTP code is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be exactly 6 digits")
    private String otpCode;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;
}