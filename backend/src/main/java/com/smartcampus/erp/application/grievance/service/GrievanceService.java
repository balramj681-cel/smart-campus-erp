package com.smartcampus.erp.application.grievance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.grievance.dto.CreateGrievanceRequest;
import com.smartcampus.erp.application.grievance.dto.GrievanceResponse;
import com.smartcampus.erp.application.grievance.dto.UpdateGrievanceStatusRequest;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.grievance.Grievance;
import com.smartcampus.erp.domain.shared.enums.GrievanceCategory;
import com.smartcampus.erp.domain.shared.enums.GrievancePriority;
import com.smartcampus.erp.domain.shared.enums.GrievanceStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.grievance.repository.GrievanceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GrievanceService {

    private final GrievanceRepository grievanceRepo;
    private final UserRepository      userRepo;
    private final NotificationService notificationService;

    // ── Apni grievances (student/faculty) ──────────────────────────────────

    public Page<GrievanceResponse> getMyGrievances(String userEmail, int page, int size) {
        User user = findUserOrThrow(userEmail);
        Pageable pageable = PageRequest.of(page, size);
        return grievanceRepo.findAllByRaisedByIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(g -> toResponse(g, true));
    }

    // ── Sab grievances (admin/staff) ────────────────────────────────────────

    public Page<GrievanceResponse> getAllForAdmin(
            GrievanceStatus status, GrievanceCategory category, String search, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";

        return grievanceRepo.findAllForAdmin(status, category, q, pageable)
                .map(g -> toResponse(g, false));
    }

    // ── Stats (admin dashboard cards) ───────────────────────────────────────

    public Map<String, Long> getStats() {
        return Map.of(
                "PENDING",     grievanceRepo.countByStatus(GrievanceStatus.PENDING),
                "IN_PROGRESS", grievanceRepo.countByStatus(GrievanceStatus.IN_PROGRESS),
                "RESOLVED",    grievanceRepo.countByStatus(GrievanceStatus.RESOLVED),
                "REJECTED",    grievanceRepo.countByStatus(GrievanceStatus.REJECTED)
        );
    }

    // ── Get single (with ownership check) ───────────────────────────────────

    public GrievanceResponse getById(UUID id, Authentication auth) {
        Grievance g = findOrThrow(id);
        boolean isAdmin = hasRole(auth, Role.ADMIN) || hasRole(auth, Role.SUPER_ADMIN)
                || hasRole(auth, Role.STAFF);
        boolean isOwner = g.getRaisedBy().getEmail().equalsIgnoreCase(auth.getName());

        if (!isAdmin && !isOwner) {
            throw new IllegalArgumentException("You are not authorized to view this grievance.");
        }
        return toResponse(g, !isAdmin);
    }

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public GrievanceResponse create(CreateGrievanceRequest req, String userEmail) {
        User user = findUserOrThrow(userEmail);

        Grievance grievance = grievanceRepo.save(Grievance.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .category(req.getCategory())
                .priority(req.getPriority() != null ? req.getPriority() : GrievancePriority.MEDIUM)
                .status(GrievanceStatus.PENDING)
                .raisedBy(user)
                .anonymous(req.isAnonymous())
                .build());

        // Har admin/super-admin ko notify karo ki nayi grievance aayi hai
        List<User> admins = userRepo.findAllByRole(Role.ADMIN);
        List<User> superAdmins = userRepo.findAllByRole(Role.SUPER_ADMIN);
        String notifyTitle = "New Grievance Filed";
        String notifyMsg   = grievance.getTitle();
        admins.forEach(a -> notificationService.pushToUser(
                a, notifyTitle, notifyMsg, NotificationType.GRIEVANCE, grievance.getId()));
        superAdmins.forEach(a -> notificationService.pushToUser(
                a, notifyTitle, notifyMsg, NotificationType.GRIEVANCE, grievance.getId()));

        return toResponse(grievance, true);
    }

    // ── Update status (admin/staff) ─────────────────────────────────────────

    @Transactional
    public GrievanceResponse updateStatus(UUID id, UpdateGrievanceStatusRequest req) {
        Grievance g = findOrThrow(id);

        g.setStatus(req.getStatus());
        if (req.getResolutionRemarks() != null) {
            g.setResolutionRemarks(req.getResolutionRemarks());
        }
        if (req.getAssignedToId() != null) {
            User assignee = userRepo.findById(req.getAssignedToId())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
            g.setAssignedTo(assignee);
        }
        if (req.getStatus() == GrievanceStatus.RESOLVED || req.getStatus() == GrievanceStatus.REJECTED) {
            g.setResolvedAt(LocalDateTime.now());
        }

        Grievance saved = grievanceRepo.save(g);

        // Raiser ko status update ka notification bhejo
        notificationService.pushToUser(
                saved.getRaisedBy(),
                "Grievance Update: " + saved.getStatus().getDisplayName(),
                saved.getTitle(),
                NotificationType.GRIEVANCE,
                saved.getId());

        return toResponse(saved, false);
    }

    // ── Delete (owner — sirf PENDING state mein — ya admin) ─────────────────

    @Transactional
    public void delete(UUID id, Authentication auth) {
        Grievance g = findOrThrow(id);
        boolean isAdmin = hasRole(auth, Role.ADMIN) || hasRole(auth, Role.SUPER_ADMIN);
        boolean isOwner = g.getRaisedBy().getEmail().equalsIgnoreCase(auth.getName());

        if (!isAdmin && !(isOwner && g.getStatus() == GrievanceStatus.PENDING)) {
            throw new IllegalArgumentException(
                    "Grievance can only be withdrawn while it is still Pending.");
        }
        grievanceRepo.deleteById(id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean hasRole(Authentication auth, Role role) {
        return auth.getAuthorities().contains(
                new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    private User findUserOrThrow(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Grievance findOrThrow(UUID id) {
        return grievanceRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Grievance not found: " + id));
    }

    private GrievanceResponse toResponse(Grievance g, boolean maskIfAnonymous) {
        User raiser = g.getRaisedBy();
        boolean hideName = g.isAnonymous() && maskIfAnonymous;

        User assignee = g.getAssignedTo();

        return GrievanceResponse.builder()
                .id(g.getId())
                .title(g.getTitle())
                .description(g.getDescription())
                .category(g.getCategory())
                .categoryDisplay(g.getCategory().getDisplayName())
                .categoryEmoji(g.getCategory().getEmoji())
                .priority(g.getPriority())
                .priorityDisplay(g.getPriority().getDisplayName())
                .priorityEmoji(g.getPriority().getEmoji())
                .status(g.getStatus())
                .statusDisplay(g.getStatus().getDisplayName())
                .statusEmoji(g.getStatus().getEmoji())
                .raisedById(raiser.getId())
                .raisedByName(hideName ? "Anonymous" : raiser.getFirstName() + " " + raiser.getLastName())
                .raisedByRole(hideName ? null : raiser.getRole().name())
                .anonymous(g.isAnonymous())
                .assignedToId(assignee != null ? assignee.getId() : null)
                .assignedToName(assignee != null ? assignee.getFirstName() + " " + assignee.getLastName() : null)
                .resolutionRemarks(g.getResolutionRemarks())
                .resolvedAt(g.getResolvedAt())
                .createdAt(g.getCreatedAt())
                .updatedAt(g.getUpdatedAt())
                .build();
    }
}