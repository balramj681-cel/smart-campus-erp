package com.smartcampus.erp.application.notification.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.notification.dto.NotificationResponse;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.notification.Notification;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.notification.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

/**
 * Owns both halves of "real-time notification": persisting a
 * {@link Notification} row (so it survives in the inbox even if the
 * recipient is offline) and pushing it live over the WebSocket/STOMP
 * broker (so an already-connected client sees it instantly, no refresh
 * needed).
 *
 * <p>Other modules call {@link #pushToUser} whenever something worth
 * telling a specific user about happens — a book issued, a fee due, an
 * exam result published. {@link #broadcastNotice} is the one all-users
 * exception, used for campus-wide notices where persisting a row per
 * recipient isn't worth it.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository    notificationRepo;
    private final UserRepository            userRepo;
    private final SimpMessagingTemplate     messagingTemplate;

    /**
     * Persists a notification for one user and pushes it to their private
     * WebSocket queue ({@code /user/queue/notifications}) if they currently
     * have an open connection. Safe to call even if they're offline — the
     * row is still there next time they open the notification bell.
     */
    @Transactional
    public NotificationResponse pushToUser(User recipient, String title, String message,
                                            NotificationType type, UUID referenceId) {
        Notification saved = notificationRepo.save(Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build());

        NotificationResponse dto = toResponse(saved);
        messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/notifications", dto);
        return dto;
    }

    /**
     * Broadcasts a payload to every currently-connected client on the
     * shared {@code /topic/notices} channel — used for campus-wide notice
     * board updates where a per-recipient row would be unnecessary noise.
     */
    public void broadcastNotice(Object noticePayload) {
        messagingTemplate.convertAndSend("/topic/notices", noticePayload);
    }

    public Page<NotificationResponse> getMyNotifications(String userEmail, int page, int size) {
        User user = findUserOrThrow(userEmail);
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepo.findAllByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    public long getUnreadCount(String userEmail) {
        User user = findUserOrThrow(userEmail);
        return notificationRepo.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markRead(UUID id, String userEmail) {
        Notification n = notificationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!n.getRecipient().getEmail().equalsIgnoreCase(userEmail)) {
            throw new IllegalArgumentException("This notification does not belong to you.");
        }
        n.setRead(true);
        notificationRepo.save(n);
    }

    @Transactional
    public void markAllRead(String userEmail) {
        User user = findUserOrThrow(userEmail);
        notificationRepo.markAllReadForRecipient(user.getId());
    }

    private User findUserOrThrow(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .typeDisplay(n.getType().getDisplayName())
                .typeEmoji(n.getType().getEmoji())
                .referenceId(n.getReferenceId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}