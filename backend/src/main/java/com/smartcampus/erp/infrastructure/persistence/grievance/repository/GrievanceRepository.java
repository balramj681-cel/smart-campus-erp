package com.smartcampus.erp.infrastructure.persistence.grievance.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.grievance.Grievance;
import com.smartcampus.erp.domain.shared.enums.GrievanceCategory;
import com.smartcampus.erp.domain.shared.enums.GrievanceStatus;

@Repository
public interface GrievanceRepository extends JpaRepository<Grievance, UUID> {

    // Apni khud ki raised grievances — student/faculty view
    Page<Grievance> findAllByRaisedByIdOrderByCreatedAtDesc(UUID raisedById, Pageable pageable);

    // Admin/staff — sab grievances, filtered
    @Query("""
        SELECT g FROM Grievance g
        WHERE (:status   IS NULL OR g.status   = :status)
          AND (:category IS NULL OR g.category = :category)
          AND (:q IS NULL OR :q = ''
               OR LOWER(g.title) LIKE %:q%
               OR LOWER(g.description) LIKE %:q%)
        ORDER BY
          CASE g.status WHEN 'PENDING' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END,
          g.createdAt DESC
        """)
    Page<Grievance> findAllForAdmin(
            @Param("status") GrievanceStatus status,
            @Param("category") GrievanceCategory category,
            @Param("q") String query,
            Pageable pageable);

    long countByStatus(GrievanceStatus status);
}