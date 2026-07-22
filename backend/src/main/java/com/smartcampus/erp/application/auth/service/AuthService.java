package com.smartcampus.erp.application.auth.service;

import java.security.SecureRandom;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.auth.dto.ForgotPasswordRequest;
import com.smartcampus.erp.application.auth.dto.LoginRequest;
import com.smartcampus.erp.application.auth.dto.LoginResponse;
import com.smartcampus.erp.application.auth.dto.RefreshTokenRequest;
import com.smartcampus.erp.application.auth.dto.RegisterRequest;
import com.smartcampus.erp.application.auth.dto.RegisterResponse;
import com.smartcampus.erp.application.auth.dto.ResetPasswordRequest;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;


    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final OtpService otpService;

    // ─── Step 1: Send OTP (DB mein unverified user save karo) ────────────────
    /**
     * Registration ka Step 1: - Email duplicate check karo - User DB mein save
     * karo (emailVerified = false) - OTP generate karke Email + SMS bhejo
     */
    @Transactional
    public RegisterResponse sendRegistrationOtp(RegisterRequest request) {

        log.info("[Auth] Send OTP request for email={}", request.getEmail());

        // Email already registered check
        if (userRepository.existsByEmail(request.getEmail())) {
            // Agar already verified hai to error
            User existing = userRepository.findByEmail(request.getEmail()).orElseThrow();
            if (existing.isEmailVerified()) {
                throw new IllegalArgumentException("Email already registered: " + request.getEmail());
            }
            // Agar unverified hai to dobara OTP bhejo (user ne pehle register kiya tha)
            log.info("[Auth] Resending OTP to existing unverified user: {}", request.getEmail());
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
            existing.setPhoneNumber(request.getPhoneNumber());
            String[] names = splitFullName(request.getFullName());
            existing.setFirstName(names[0]);
            existing.setLastName(names[1]);
            userRepository.save(existing);
            otpService.sendOtp(existing);
            return new RegisterResponse("OTP sent to your email and phone. Please verify.");
        }

        // Naya user banao (unverified)
        String[] names = splitFullName(request.getFullName());

        User user = User.builder()
                .firstName(names[0])
                .lastName(names[1])
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(request.getRole() == null ? Role.STUDENT : request.getRole())
                .emailVerified(false) // OTP verify hone ke baad true hoga
                .build();

        User savedUser = userRepository.save(user);

        // OTP bhejo
        otpService.sendOtp(savedUser);

        log.info("[Auth] OTP sent to new user: {}", savedUser.getEmail());

        return new RegisterResponse("OTP sent to your email and phone. Please verify.");
    }

    // ─── Step 2: Verify OTP (account confirm karo) ───────────────────────────
    /**
     * Registration ka Step 2: - OTP verify karo - emailVerified = true set hoga
     * (OtpService karta hai) - Login pe redirect kar sakte hain
     */
    @Transactional
    public RegisterResponse verifyRegistrationOtp(String email, String otp) {

        log.info("[Auth] OTP verify request for email={}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No registration found for: " + email));

        // OtpService verify karega aur emailVerified = true set karega
        otpService.verifyOtp(user, otp);

        log.info("[Auth] Registration complete for email={}", email);

        return new RegisterResponse("Account verified successfully! Please sign in.");
    }

    // ─── Login ───────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        log.info("[Auth] Login attempt for email={}", request.getEmail());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.getEmail()));

        // Email verify nahi hua to login block karo
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Email not verified. Please complete OTP verification.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("[Auth] Login successful for email={}", user.getEmail());

        return LoginResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .photoUrl(user.getPhotoUrl())
                .build();
    }

    // ✅ ADD: forgotPassword, resetPassword, aur 2 private helpers
    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail())
                .ifPresent(otpService::sendOtp);
        return "If this email is registered, a password reset code has been sent.";
    }

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email."));
        otpService.verifyOtp(user, request.getOtpCode());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return "Password reset successfully. You can now login with your new password.";
    }

// OTP generate, save, aur async email bhejo — register + forgotPassword dono use karte hain
  /*  private void sendOtp(String email, String firstName) {
        String otpCode = String.format("%0" + otpLength + "d", SECURE_RANDOM.nextInt((int) Math.pow(10, otpLength)));
        otpRepository.deleteAllByEmail(email);
        otpRepository.save(OtpEntry.builder()
                .email(email).otpCode(otpCode)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .build());
        emailService.sendOtpEmail(email, otpCode, firstName);
    } */

// OTP validate karo — expired / invalid dono handle karta hai
/*
    private void validateAndConsumeOtp(String email, String submittedCode) {
        OtpEntry entry = otpRepository.findLatestUnusedByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No pending OTP found. Please request a new one."));
        if (entry.isExpired()) {
            throw new IllegalArgumentException("OTP has expired. Please request a new one.");
        }
        if (!entry.getOtpCode().equals(submittedCode)) {
            throw new IllegalArgumentException("Invalid OTP. Please check and try again.");
        }
        entry.setUsed(true);
        otpRepository.save(entry);
    }
*/
    // ─── Helper ──────────────────────────────────────────────────────────────
    private String[] splitFullName(String fullName) {
        String value = fullName.trim();
        int index = value.indexOf(' ');
        if (index == -1) {
            return new String[]{value, ""};
        }
        return new String[]{value.substring(0, index), value.substring(index + 1).trim()};
    }



    // refresh token
    
    public LoginResponse refresh(RefreshTokenRequest request) {

    String refreshToken = request.getRefreshToken();

    String email = jwtService.extractUsername(refreshToken);

    User user = userRepository.findByEmail(email)
            .orElseThrow(() ->
                    new UsernameNotFoundException("User not found"));

    UserDetails userDetails =
            new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    java.util.List.of(
                            new SimpleGrantedAuthority(
                                    user.getRole().getAuthority()))
            );

    if (!jwtService.isRefreshTokenValid(refreshToken, userDetails)) {
        throw new IllegalArgumentException("Invalid Refresh Token");
    }

    String newAccessToken = jwtService.generateAccessToken(user);
    String newRefreshToken = jwtService.generateRefreshToken(user);

    return LoginResponse.builder()
            .userId(user.getId())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .email(user.getEmail())
            .role(user.getRole())
            .accessToken(newAccessToken)
            .refreshToken(newRefreshToken)
            .tokenType("Bearer")
            .photoUrl(user.getPhotoUrl())
            .build();
}


}
