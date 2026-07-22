package com.smartcampus.erp.application.notice.service;

import com.smartcampus.erp.application.notice.dto.CreateNoticeRequest;
import com.smartcampus.erp.application.notice.dto.NoticeResponse;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.notice.Notice;
import com.smartcampus.erp.domain.shared.enums.NoticeCategory;
import com.smartcampus.erp.domain.shared.enums.NoticeVisibility;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.notice.repository.NoticeRepository;

import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepo;
    private final UserRepository   userRepo;
    private final NotificationService notificationService;

    // ── Get notices (role-filtered) ───────────────────────────────────────

    public Page<NoticeResponse> getNotices(
            Authentication auth,
            NoticeCategory category,
            String search,
            int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";

        boolean isAdmin = hasRole(auth, Role.ADMIN) || hasRole(auth, Role.SUPER_ADMIN);

        if (isAdmin) {
            return noticeRepo.findAllForAdmin(category, null, q, pageable)
                    .map(this::toResponse);
        }

        // Determine which visibilities the current user can see
        List<NoticeVisibility> visibilities;
        if (hasRole(auth, Role.FACULTY)) {
            visibilities = List.of(NoticeVisibility.ALL, NoticeVisibility.FACULTY_ONLY);
        } else {
            // STUDENT
            visibilities = List.of(NoticeVisibility.ALL, NoticeVisibility.STUDENTS_ONLY);
        }

        return noticeRepo.findForRoles(visibilities, category, q, pageable)
                .map(this::toResponse);
    }

    // ── Pinned notices ────────────────────────────────────────────────────

    public List<NoticeResponse> getPinned() {
        return noticeRepo.findAllByActiveAndPinnedOrderByCreatedAtDesc(true, true)
                .stream().map(this::toResponse).toList();
    }

    // ── Get single notice ─────────────────────────────────────────────────

    public NoticeResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public NoticeResponse create(CreateNoticeRequest req, String userEmail) {
        User user = userRepo.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Notice notice = noticeRepo.save(Notice.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .category(req.getCategory())
                .visibility(req.getVisibility())
                .postedBy(user)
                .targetDepartmentId(req.getTargetDepartmentId())
                .targetDepartmentName(req.getTargetDepartmentName())
                .pinned(req.isPinned())
                .expiresAt(req.getExpiresAt())
                .build());

        NoticeResponse response = toResponse(notice);

        // Live-push the new notice to every connected client's notice board —
        // no refresh needed to see it appear.
        notificationService.broadcastNotice(response);

        return response;
    }

    // ── Update ────────────────────────────────────────────────────────────

    @Transactional
    public NoticeResponse update(UUID id, CreateNoticeRequest req) {
        Notice notice = findOrThrow(id);
        notice.setTitle(req.getTitle());
        notice.setContent(req.getContent());
        notice.setCategory(req.getCategory());
        notice.setVisibility(req.getVisibility());
        notice.setTargetDepartmentId(req.getTargetDepartmentId());
        notice.setTargetDepartmentName(req.getTargetDepartmentName());
        notice.setPinned(req.isPinned());
        notice.setExpiresAt(req.getExpiresAt());
        return toResponse(noticeRepo.save(notice));
    }

    // ── Toggle pin ────────────────────────────────────────────────────────

    @Transactional
    public NoticeResponse togglePin(UUID id) {
        Notice notice = findOrThrow(id);
        notice.setPinned(!notice.isPinned());
        return toResponse(noticeRepo.save(notice));
    }

    // ── Toggle active ─────────────────────────────────────────────────────

    @Transactional
    public NoticeResponse toggleActive(UUID id) {
        Notice notice = findOrThrow(id);
        notice.setActive(!notice.isActive());
        return toResponse(noticeRepo.save(notice));
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) { noticeRepo.deleteById(id); }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean hasRole(Authentication auth, Role role) {
        return auth.getAuthorities().contains(
                new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    private Notice findOrThrow(UUID id) {
        return noticeRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notice not found: " + id));
    }

    private NoticeResponse toResponse(Notice n) {
        User author = n.getPostedBy();
        return NoticeResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .content(n.getContent())
                .category(n.getCategory())
                .categoryDisplay(n.getCategory().getDisplayName())
                .categoryEmoji(n.getCategory().getEmoji())
                .visibility(n.getVisibility())
                .visibilityDisplay(n.getVisibility().getDisplayName())
                .postedById(author.getId())
                .postedByName(author.getFirstName() + " " + author.getLastName())
                .postedByRole(author.getRole().name())
                .targetDepartmentId(n.getTargetDepartmentId())
                .targetDepartmentName(n.getTargetDepartmentName())
                .pinned(n.isPinned())
                .active(n.isActive())
                .expired(n.isExpired())
                .expiresAt(n.getExpiresAt())
                .createdAt(n.getCreatedAt())
                .updatedAt(n.getUpdatedAt())
                .build();
    }
}