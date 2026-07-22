package com.smartcampus.erp.application.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.auth.dto.ChangePasswordRequest;
import com.smartcampus.erp.application.auth.dto.ProfileResponse;
import com.smartcampus.erp.application.auth.dto.UpdateProfileRequest;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.storage.FileStorageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final String PHOTO_SUBDIR = "profile-photos";

    private final UserRepository     userRepo;
    private final PasswordEncoder    passwordEncoder;
    private final FileStorageService fileStorageService;

    public ProfileResponse getMyProfile(String email) {
        return toResponse(findUser(email));
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest req) {
        User user = findUser(email);
        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        user.setPhoneNumber(req.getPhoneNumber());
        return toResponse(userRepo.save(user));
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User user = findUser(email);
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password galat hai.");
        }
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);
    }

    @Transactional
    public ProfileResponse uploadPhoto(String email, MultipartFile file) {
        User user = findUser(email);

        // Purani photo hai to delete kar do (disk clutter avoid karne ke liye)
        if (user.getPhotoUrl() != null) {
            fileStorageService.delete(PHOTO_SUBDIR, user.getPhotoUrl());
        }

        String storedFileName = fileStorageService.store(file, PHOTO_SUBDIR);
        user.setPhotoUrl(storedFileName);
        return toResponse(userRepo.save(user));
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private ProfileResponse toResponse(User u) {
        return ProfileResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .phoneNumber(u.getPhoneNumber())
                .role(u.getRole())
                .photoUrl(u.getPhotoUrl())
                .joinedAt(u.getCreatedAt())
                .build();
    }
}