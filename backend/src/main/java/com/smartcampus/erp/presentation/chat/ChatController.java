package com.smartcampus.erp.presentation.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.chat.dto.ChatUserResponse;
import com.smartcampus.erp.application.chat.dto.ConversationResponse;
import com.smartcampus.erp.application.chat.dto.MessageResponse;
import com.smartcampus.erp.application.chat.dto.SendMessageRequest;
import com.smartcampus.erp.application.chat.service.ChatService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/users")
    public ResponseEntity<List<ChatUserResponse>> searchUsers(
            Authentication auth, @RequestParam(required = false) String q) {
        return ResponseEntity.ok(chatService.searchUsers(auth.getName(), q));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(Authentication auth) {
        return ResponseEntity.ok(chatService.getMyConversations(auth.getName()));
    }

    @PostMapping("/conversations/{otherUserId}")
    public ResponseEntity<ConversationResponse> startConversation(
            @PathVariable UUID otherUserId, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.startConversation(auth.getName(), otherUserId));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable UUID id, Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(chatService.getMessages(id, auth.getName(), page, size));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable UUID id, @Valid @RequestBody SendMessageRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.sendMessage(id, req, auth.getName()));
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, Authentication auth) {
        chatService.markRead(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // markRead() endpoint ke NEECHE ye add karo:
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID id, Authentication auth) {
        chatService.deleteConversation(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

        @GetMapping("/unread-count")
        public ResponseEntity<Long> getUnreadCount(Authentication auth) {
            return ResponseEntity.ok(chatService.getTotalUnread(auth.getName()));
        }
    }
