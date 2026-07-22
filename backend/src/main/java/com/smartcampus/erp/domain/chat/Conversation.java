package com.smartcampus.erp.domain.chat;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.auth.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A 1-to-1 direct-message thread between two users. {@code participantOne}
 * always holds whichever of the two user IDs sorts lexicographically first
 * — a canonical ordering that makes the uniqueness constraint below work
 * without needing an OR-based lookup on every write.
 */
@Entity
@Table(
    name = "chat_conversations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"participant_one_id", "participant_two_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_one_id", nullable = false)
    private User participantOne;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_two_id", nullable = false)
    private User participantTwo;

    private LocalDateTime lastMessageAt;

    @Column(length = 300)
    private String lastMessagePreview;

    @CreatedDate @Column(updatable = false) private LocalDateTime createdAt;
}