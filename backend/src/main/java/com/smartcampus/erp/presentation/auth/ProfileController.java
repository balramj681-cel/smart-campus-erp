package com.smartcampus.erp.presentation.auth;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.auth.dto.ChangePasswordRequest;
import com.smartcampus.erp.application.auth.dto.ProfileResponse;
import com.smartcampus.erp.application.auth.dto.UpdateProfileRequest;
import com.smartcampus.erp.application.auth.service.ProfileService;
import com.smartcampus.erp.infrastructure.storage.FileStorageService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService     profileService;
    private final FileStorageService fileStorageService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(Authentication auth) {
        return ResponseEntity.ok(profileService.getMyProfile(auth.getName()));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req, Authentication auth) {
        return ResponseEntity.ok(profileService.updateProfile(auth.getName(), req));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest req, Authentication auth) {
        profileService.changePassword(auth.getName(), req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/photo")
    public ResponseEntity<ProfileResponse> uploadPhoto(
            @RequestParam("file") MultipartFile file, Authentication auth) {
        return ResponseEntity.ok(profileService.uploadPhoto(auth.getName(), file));
    }

    // Publicly-reachable (via PUBLIC_ENDPOINTS in SecurityConfig) — image tags
    // in <img src> can't attach an Authorization header.
    @GetMapping("/photo/{filename}")
    public ResponseEntity<Resource> getPhoto(@PathVariable String filename) {
        Resource resource = fileStorageService.loadAsResource("profile-photos", filename);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }
}