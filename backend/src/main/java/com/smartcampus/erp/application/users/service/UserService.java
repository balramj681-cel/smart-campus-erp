package com.smartcampus.erp.application.users.service;

import com.smartcampus.erp.application.users.dto.CreateUserRequest;
import com.smartcampus.erp.application.users.dto.UpdateUserRequest;
import com.smartcampus.erp.application.users.dto.UserResponse;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository facultyRepo;
    private final com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository studentRepo;

    // ── List with search + filter ──────────────────────────────────────────
    public Page<UserResponse> getAllUsers(int page, int size, String search, Role role, Boolean active) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (search != null && !search.isBlank() && role != null) {
            return userRepository.findBySearchAndRole(search.trim().toLowerCase(), role, pageable)
                    .map(this::toResponse);
        }
        if (search != null && !search.isBlank()) {
            return userRepository.findBySearch(search.trim().toLowerCase(), pageable)
                    .map(this::toResponse);
        }
        if (role != null) {
            return userRepository.findByRole(role, pageable).map(this::toResponse);
        }
        if (active != null) {
            return userRepository.findByEnabled(active, pageable).map(this::toResponse);
        }
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    // ── Single user ────────────────────────────────────────────────────────
    public UserResponse getUserById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // ── Create ─────────────────────────────────────────────────────────────
    @Transactional
    public UserResponse createUser(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + req.getEmail());
        }

        User user = User.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail().toLowerCase())
                .password(passwordEncoder.encode(req.getPassword()))
                .phoneNumber(req.getPhoneNumber())
                .role(req.getRole())
                .enabled(true)
                .emailVerified(true) // Admin-created accounts skip OTP
                .build();

        return toResponse(userRepository.save(user));
    }

    // ── Update ─────────────────────────────────────────────────────────────
    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest req) {
        User user = findOrThrow(id);
        if (req.getFirstName() != null) {
            user.setFirstName(req.getFirstName());
        }
        if (req.getLastName() != null) {
            user.setLastName(req.getLastName());
        }
        if (req.getPhoneNumber() != null) {
            user.setPhoneNumber(req.getPhoneNumber());
        }
        if (req.getRole() != null) {
            user.setRole(req.getRole());
        }
        return toResponse(userRepository.save(user));
    }

    // ── Toggle active/inactive ─────────────────────────────────────────────
    @Transactional
    public UserResponse toggleStatus(UUID id) {
        User user = findOrThrow(id);
        user.setEnabled(!user.isEnabled());
        return toResponse(userRepository.save(user));
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    @Transactional
    public void deleteUser(UUID id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found: " + id);
        }
        userRepository.deleteById(id);
    }

    // ── Stats (Dashboard ke liye) ──────────────────────────────────────────
    public long totalUsers() {
        return userRepository.count();
    }

    public long countByRole(Role role) {
        return userRepository.countByRole(role);
    }

    public long activeUsers() {
        return userRepository.countByEnabled(true);
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private User findOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    private UserResponse toResponse(User u) {

        boolean hasProfile = switch (u.getRole()) {
            case FACULTY ->
                facultyRepo.existsByUserId(u.getId());
            case STUDENT ->
                studentRepo.existsByUserId(u.getId());
            default ->
                true; // baaki roles ke liye profile-concept applicable nahi
        };
        return UserResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .phoneNumber(u.getPhoneNumber())
                .role(u.getRole())
                .enabled(u.isEnabled())
                .accountLocked(u.isAccountLocked())
                .emailVerified(u.isEmailVerified())
                .lastLoginAt(u.getLastLoginAt())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .hasProfile(hasProfile)
                .build();
    }
}
