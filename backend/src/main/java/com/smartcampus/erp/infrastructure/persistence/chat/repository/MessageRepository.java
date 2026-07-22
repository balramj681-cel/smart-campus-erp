package com.smartcampus.erp.infrastructure.persistence.chat.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.domain.chat.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findAllByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    long countByConversationIdAndReadFalseAndSenderIdNot(UUID conversationId, UUID senderId);

    @Modifying
    @Transactional
    @Query("""
        UPDATE Message m SET m.read = true
        WHERE m.conversation.id = :conversationId AND m.sender.id <> :viewerId AND m.read = false
        """)
    void markConversationRead(@Param("conversationId") UUID conversationId, @Param("viewerId") UUID viewerId);

    // Sidebar badge — total unread messages across every conversation the user is in
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.sender.id <> :userId AND m.read = false
          AND (m.conversation.participantOne.id = :userId OR m.conversation.participantTwo.id = :userId)
        """)
    long countTotalUnreadForUser(@Param("userId") UUID userId);

    // countTotalUnreadForUser() ke NEECHE ye add karo:
    @Modifying
    @Transactional
    @Query("DELETE FROM Message m WHERE m.conversation.id = :conversationId")
    void deleteAllByConversationId(@Param("conversationId") UUID conversationId);

    List<Message> findTop1ByConversationIdOrderByCreatedAtDesc(UUID conversationId);
}
