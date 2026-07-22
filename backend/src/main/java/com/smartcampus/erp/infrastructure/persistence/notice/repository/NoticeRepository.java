package com.smartcampus.erp.infrastructure.persistence.notice.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.notice.Notice;
import com.smartcampus.erp.domain.shared.enums.NoticeCategory;
import com.smartcampus.erp.domain.shared.enums.NoticeVisibility;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, UUID> {

    // Pinned notices — sabse upar dikhein
    List<Notice> findAllByActiveAndPinnedOrderByCreatedAtDesc(
            boolean active, boolean pinned);

    // Role-based filtered notices (paginated)
    @Query("""
    SELECT n FROM Notice n
    WHERE n.active = true
      AND (n.expiresAt IS NULL OR n.expiresAt >= CURRENT_DATE)
      AND n.visibility IN :visibilities
      AND (:category IS NULL OR n.category = :category)
      AND (:q IS NULL OR :q = ''
           OR LOWER(n.title) LIKE %:q%
           OR LOWER(n.content) LIKE %:q%)
    ORDER BY n.pinned DESC, n.createdAt DESC
    """)
    Page<Notice> findForRoles(
            @Param("visibilities") List<NoticeVisibility> visibilities,
            @Param("category") NoticeCategory category,
            @Param("q") String query,
            Pageable pageable);

    // Admin — all notices (including inactive)
    @Query("""
        SELECT n FROM Notice n
        WHERE (:category IS NULL OR n.category = :category)
          AND (:active   IS NULL OR n.active   = :active)
          AND (:q IS NULL OR :q = ''
               OR LOWER(n.title) LIKE %:q%
               OR LOWER(n.content) LIKE %:q%)
        ORDER BY n.pinned DESC, n.createdAt DESC
        """)
    Page<Notice> findAllForAdmin(
            @Param("category") NoticeCategory category,
            @Param("active") Boolean active,
            @Param("q") String query,
            Pageable pageable);
}
