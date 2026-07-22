package com.smartcampus.erp.presentation.auth;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.auth.dto.ForgotPasswordRequest;
import com.smartcampus.erp.application.auth.dto.LoginRequest;
import com.smartcampus.erp.application.auth.dto.LoginResponse;
import com.smartcampus.erp.application.auth.dto.RefreshTokenRequest;
import com.smartcampus.erp.application.auth.dto.RegisterRequest;
import com.smartcampus.erp.application.auth.dto.RegisterResponse;
import com.smartcampus.erp.application.auth.dto.ResetPasswordRequest;
import com.smartcampus.erp.application.auth.service.AuthService;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;



/**
 * Auth endpoints:
 *
 * POST /api/auth/send-otp → Step 1: Form data bhejo, OTP aayega POST
 * /api/auth/verify-otp → Step 2: OTP verify karo, account confirm hoga POST
 * /api/auth/login → Login (sirf verified users ke liye)
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepo;
    private final FacultyProfileRepository facultyProfileRepo;

    /**
     * Step 1: Registration form submit karo. OTP Email + SMS pe bheja jayega.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<RegisterResponse> sendOtp(
            @Valid @RequestBody RegisterRequest request) {

        RegisterResponse response = authService.sendRegistrationOtp(request);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    /**
     * Step 2: OTP verify karo. Sahi OTP → account verified → login kar sakte
     * ho.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<RegisterResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        RegisterResponse response = authService.verifyRegistrationOtp(
                request.getEmail(), request.getOtp());
        return ResponseEntity.ok(response);
    }

    /**
     * Login — sirf verified accounts ke liye.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // ✅ ADD THESE 2 ENDPOINTS:

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    // ─── Inner DTO (sirf is controller ke liye) ──────────────────────────────
    @Data
    public static class VerifyOtpRequest {

        @Email(message = "Invalid email")
        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "OTP is required")
        @Size(min = 6, max = 6, message = "OTP must be 6 digits")
        private String otp;
    }


    @GetMapping("/me")
    public ResponseEntity<LoginResponse> getCurrentUser(Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // Student/Faculty profile IDs bhi include karo
        UUID studentProfileId = null;
        UUID facultyProfileId = null;
        try {
            studentProfileId = studentProfileRepo.findByUserId(user.getId())
                    .map(sp -> sp.getId()).orElse(null);
        } catch (Exception ignored) {}
        try {
            facultyProfileId = facultyProfileRepo.findByUserId(user.getId())
                    .map(fp -> fp.getId()).orElse(null);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(LoginResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .tokenType("Bearer")
                .studentProfileId(studentProfileId)
                .facultyProfileId(facultyProfileId)
                .photoUrl(user.getPhotoUrl())
                .build());
    }


    @PostMapping("/refresh")
public ResponseEntity<LoginResponse> refresh(
        @Valid @RequestBody RefreshTokenRequest request) {

    return ResponseEntity.ok(authService.refresh(request));
}
}
