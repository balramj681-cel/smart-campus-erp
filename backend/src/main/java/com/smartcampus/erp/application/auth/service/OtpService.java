
package com.smartcampus.erp.application.auth.service;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * OTP generate karta hai, Email + SMS se bhejta hai,
 * aur verify karta hai.
 *
 * Flow:
 *  1. sendOtp()   → 6-digit OTP generate → DB mein hash store → Email + SMS bhejo
 *  2. verifyOtp() → OTP match karo → match hone pe clear karo → true return karo
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${otp.max-attempts:3}")
    private int maxAttempts;

    @Value("${twilio.account-sid}")
    private String twilioAccountSid;

    @Value("${twilio.auth-token}")
    private String twilioAuthToken;

    @Value("${twilio.phone-number}")
    private String twilioPhoneNumber;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ─── 1. OTP Generate & Send ───────────────────────────────────────────────

    /**
     * User ke liye OTP generate karo aur Email + SMS bhejo.
     * User already DB mein hona chahiye (emailVerified = false).
     */
    @Transactional
    public void sendOtp(User user) {

        String otp = generateOtp();
        String hashedOtp = passwordEncoder.encode(otp);

        // DB mein store karo (hashed)
        user.setOtpHash(hashedOtp);
        user.setOtpExpiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes));
        user.setOtpAttempts(0);
        userRepository.save(user);

        // Email bhejo
        sendOtpEmail(user.getEmail(), user.getFirstName(), otp);

        // SMS bhejo
        if (user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank()) {
            sendOtpSms(user.getPhoneNumber(), otp);
        }

        log.info("[OTP] Sent to email={} phone={}", user.getEmail(), maskPhone(user.getPhoneNumber()));
    }

    // ─── 2. OTP Verify ───────────────────────────────────────────────────────

    /**
     * OTP verify karo.
     *
     * @return true agar OTP sahi hai
     * @throws IllegalStateException agar OTP expire ho gaya ya attempts khatam
     * @throws IllegalArgumentException agar OTP galat hai
     */
    @Transactional
    public boolean verifyOtp(User user, String enteredOtp) {

        // OTP hai hi nahi
        if (user.getOtpHash() == null) {
            throw new IllegalStateException("No OTP found. Please request a new OTP.");
        }

        // OTP expire ho gaya
        if (user.getOtpExpiresAt() == null || LocalDateTime.now().isAfter(user.getOtpExpiresAt())) {
            user.clearOtp();
            userRepository.save(user);
            throw new IllegalStateException("OTP has expired. Please request a new one.");
        }

        // Max attempts cross ho gaye
        if (user.getOtpAttempts() >= maxAttempts) {
            user.clearOtp();
            userRepository.save(user);
            throw new IllegalStateException("Too many wrong attempts. Please request a new OTP.");
        }

        // OTP galat hai
        if (!passwordEncoder.matches(enteredOtp, user.getOtpHash())) {
            user.setOtpAttempts(user.getOtpAttempts() + 1);
            userRepository.save(user);
            int remaining = maxAttempts - user.getOtpAttempts();
            throw new IllegalArgumentException("Incorrect OTP. " + remaining + " attempt(s) remaining.");
        }

        // ✅ OTP sahi hai — clear karo aur verified mark karo
        user.clearOtp();
        user.setEmailVerified(true);
        userRepository.save(user);

        log.info("[OTP] Verified successfully for email={}", user.getEmail());
        return true;
    }

    // ─── 3. Private Helpers ───────────────────────────────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000); // 6 digits: 100000–999999
        return String.valueOf(otp);
    }

    private void sendOtpEmail(String to, String name, String otp) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(to);
            msg.setSubject("Smart Campus ERP — Your Verification OTP");
            msg.setText(
                "Hi " + name + ",\n\n" +
                "Your OTP for account verification is:\n\n" +
                "    " + otp + "\n\n" +
                "This OTP is valid for " + otpExpiryMinutes + " minutes.\n" +
                "Do not share this code with anyone.\n\n" +
                "— Smart Campus ERP Team"
            );
            mailSender.send(msg);
            log.debug("[OTP] Email sent to {}", to);
        } catch (Exception e) {
            log.error("[OTP] Email send failed to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send OTP email. Please try again.");
        }
    }

    private void sendOtpSms(String phone, String otp) {
        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            Message.creator(
                new PhoneNumber(phone),
                new PhoneNumber(twilioPhoneNumber),
                "Smart Campus ERP: Your OTP is " + otp +
                ". Valid for " + otpExpiryMinutes + " mins. Do not share."
            ).create();
            log.debug("[OTP] SMS sent to {}", maskPhone(phone));
        } catch (Exception e) {
            log.error("[OTP] SMS send failed to {}: {}", maskPhone(phone), e.getMessage());
            // SMS fail hone pe registration rokna nahi chahte — sirf log karo
            // Email pe OTP pahuch gaya hai
            log.warn("[OTP] SMS failed but email was sent. User can proceed with email OTP.");
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "****" + phone.substring(phone.length() - 4);
    }
}
