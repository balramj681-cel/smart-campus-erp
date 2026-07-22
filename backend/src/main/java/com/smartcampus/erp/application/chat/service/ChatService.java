package com.smartcampus.erp.application.chat.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.chat.dto.ChatUserResponse;
import com.smartcampus.erp.application.chat.dto.ConversationResponse;
import com.smartcampus.erp.application.chat.dto.MessageResponse;
import com.smartcampus.erp.application.chat.dto.SendMessageRequest;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.chat.Conversation;
import com.smartcampus.erp.domain.chat.Message;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.chat.repository.ConversationRepository;
import com.smartcampus.erp.infrastructure.persistence.chat.repository.MessageRepository;

import lombok.RequiredArgsConstructor;

/**
 * Owns both halves of direct messaging: persisting {@link Message} rows (so
 * history survives a refresh / the recipient being offline) and pushing new
 * messages live over the same STOMP broker
 * {@link com.smartcampus.erp.application.notification.service.NotificationService}
 * already uses for notifications — one connection, two private queues:
 * {@code /queue/notifications} and {@code /queue/messages}.
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Directory — users you can start a chat with ─────────────────────────
    public List<ChatUserResponse> searchUsers(String userEmail, String query) {
        User me = findUserOrThrow(userEmail);
        String q = (query == null || query.isBlank()) ? "" : query.toLowerCase();

        return userRepo.findBySearch(q, Pageable.ofSize(20)).getContent().stream()
                .filter(u -> !u.getId().equals(me.getId()))
                .map(u -> ChatUserResponse.builder()
                .id(u.getId())
                .name(u.getFirstName() + " " + u.getLastName())
                .email(u.getEmail())
                .role(u.getRole().name())
                .build())
                .collect(Collectors.toList());
    }

    // ── Conversation list (sidebar) ─────────────────────────────────────────
    public List<ConversationResponse> getMyConversations(String userEmail) {
        User me = findUserOrThrow(userEmail);
        return conversationRepo.findAllForUser(me.getId()).stream()
                .map(c -> toResponse(c, me))
                .collect(Collectors.toList());
    }

    // ── Start (or resume) a conversation with another user ──────────────────
    @Transactional
    public ConversationResponse startConversation(String userEmail, UUID otherUserId) {
        User me = findUserOrThrow(userEmail);
        User other = userRepo.findById(otherUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Conversation convo = conversationRepo.findBetween(me.getId(), otherUserId)
                .orElseGet(() -> {
                    // Canonical ordering so (A,B) and (B,A) never create two rows.
                    boolean meFirst = me.getId().toString().compareTo(other.getId().toString()) < 0;
                    return conversationRepo.save(Conversation.builder()
                            .participantOne(meFirst ? me : other)
                            .participantTwo(meFirst ? other : me)
                            .build());
                });

        return toResponse(convo, me);
    }

    // ── Message history ──────────────────────────────────────────────────
    public Page<MessageResponse> getMessages(UUID conversationId, String userEmail, int page, int size) {
        User me = findUserOrThrow(userEmail);
        Conversation convo = findConversationOrThrow(conversationId);
        assertParticipant(convo, me);

        return messageRepo.findAllByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Send ──────────────────────────────────────────────────────────────
    @Transactional
    public MessageResponse sendMessage(UUID conversationId, SendMessageRequest req, String userEmail) {
        User me = findUserOrThrow(userEmail);
        Conversation convo = findConversationOrThrow(conversationId);
        assertParticipant(convo, me);

        Message saved = messageRepo.save(Message.builder()
                .conversation(convo)
                .sender(me)
                .content(req.getContent())
                .build());

        convo.setLastMessageAt(LocalDateTime.now());
        convo.setLastMessagePreview(
                req.getContent().length() > 100 ? req.getContent().substring(0, 100) + "…" : req.getContent());
        conversationRepo.save(convo);

        MessageResponse dto = toResponse(saved);

        User recipient = convo.getParticipantOne().getId().equals(me.getId())
                ? convo.getParticipantTwo() : convo.getParticipantOne();
        messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", dto);

        return dto;
    }

    // ── Mark read ────────────────────────────────────────────────────────
    /*
    @Transactional
    public void markRead(UUID conversationId, String userEmail) {
        User me = findUserOrThrow(userEmail);
        Conversation convo = findConversationOrThrow(conversationId);
        assertParticipant(convo, me);
        messageRepo.markConversationRead(conversationId, me.getId());
    }
     */
    @Transactional
    public void markRead(UUID conversationId, String userEmail) {
        User me = findUserOrThrow(userEmail);
        Conversation convo = findConversationOrThrow(conversationId);
        assertParticipant(convo, me);

        messageRepo.markConversationRead(conversationId, me.getId());

        // Doosre participant (jiske messages abhi read hue) ko turant batao —
        // isi se unki taraf single tick blue double-tick mein badal jaayega,
        // bina unhe kuch reload kiye.
        User sender = convo.getParticipantOne().getId().equals(me.getId())
                ? convo.getParticipantTwo() : convo.getParticipantOne();

        messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/message-read",
                java.util.Map.of("conversationId", conversationId));
    }

    // markRead() method ke NEECHE ye add karo:
    @Transactional
    public void deleteConversation(UUID conversationId, String userEmail) {
        User me = findUserOrThrow(userEmail);
        Conversation convo = findConversationOrThrow(conversationId);
        assertParticipant(convo, me);

        messageRepo.deleteAllByConversationId(conversationId);
        conversationRepo.delete(convo);
    }

    public long getTotalUnread(String userEmail) {
        User me = findUserOrThrow(userEmail);
        return messageRepo.countTotalUnreadForUser(me.getId());
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private void assertParticipant(Conversation convo, User user) {
        boolean isParticipant = convo.getParticipantOne().getId().equals(user.getId())
                || convo.getParticipantTwo().getId().equals(user.getId());
        if (!isParticipant) {
            throw new IllegalArgumentException("You are not part of this conversation.");
        }
    }

    private User findUserOrThrow(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Conversation findConversationOrThrow(UUID id) {
        return conversationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
    }

    private ConversationResponse toResponse(Conversation c, User viewer) {
        User other = c.getParticipantOne().getId().equals(viewer.getId())
                ? c.getParticipantTwo() : c.getParticipantOne();
        long unread = messageRepo.countByConversationIdAndReadFalseAndSenderIdNot(c.getId(), viewer.getId());

        return ConversationResponse.builder()
                .id(c.getId())
                .otherUserId(other.getId())
                .otherUserName(other.getFirstName() + " " + other.getLastName())
                .otherUserEmail(other.getEmail())
                .otherUserRole(other.getRole().name())
                .lastMessagePreview(c.getLastMessagePreview())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .build();
    }

    private MessageResponse toResponse(Message m) {
        return MessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                .content(m.getContent())
                .read(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
