package com.smartcampus.erp.infrastructure.persistence.chat.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.chat.Conversation;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("""
        SELECT c FROM Conversation c
        WHERE (c.participantOne.id = :a AND c.participantTwo.id = :b)
           OR (c.participantOne.id = :b AND c.participantTwo.id = :a)
        """)
    Optional<Conversation> findBetween(@Param("a") UUID userA, @Param("b") UUID userB);

    @Query("""
        SELECT c FROM Conversation c
        WHERE c.participantOne.id = :userId OR c.participantTwo.id = :userId
        ORDER BY c.lastMessageAt DESC NULLS LAST
        """)
    List<Conversation> findAllForUser(@Param("userId") UUID userId);
}