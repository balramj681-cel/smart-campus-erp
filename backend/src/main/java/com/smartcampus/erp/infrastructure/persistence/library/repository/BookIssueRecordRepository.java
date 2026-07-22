package com.smartcampus.erp.infrastructure.persistence.library.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.library.BookIssueRecord;
import com.smartcampus.erp.domain.shared.enums.BookIssueStatus;

@Repository
public interface BookIssueRecordRepository extends JpaRepository<BookIssueRecord, UUID> {

    long countByBookIdAndStatus(UUID bookId, BookIssueStatus status);

    boolean existsByBookIdAndStudentIdAndStatus(UUID bookId, UUID studentId, BookIssueStatus status);

    List<BookIssueRecord> findAllByStatus(BookIssueStatus status);

    Page<BookIssueRecord> findAllByStudentIdOrderByIssueDateDesc(UUID studentId, Pageable pageable);

    @Query("""
        SELECT r FROM BookIssueRecord r
        WHERE (:status IS NULL OR r.status = :status)
          AND (:q IS NULL OR :q = ''
               OR LOWER(r.book.title)        LIKE %:q%
               OR LOWER(r.student.user.firstName) LIKE %:q%
               OR LOWER(r.student.user.lastName)  LIKE %:q%
               OR LOWER(r.student.enrollmentNumber) LIKE %:q%)
        ORDER BY r.issueDate DESC
        """)
    Page<BookIssueRecord> search(
            @Param("q")      String          query,
            @Param("status") BookIssueStatus status,
            Pageable pageable);

    long countByStatus(BookIssueStatus status);
}