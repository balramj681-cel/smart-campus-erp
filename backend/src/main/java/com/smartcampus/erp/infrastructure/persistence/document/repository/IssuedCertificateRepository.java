package com.smartcampus.erp.infrastructure.persistence.document.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.document.IssuedCertificate;
import com.smartcampus.erp.domain.shared.enums.CertificateType;

@Repository
public interface IssuedCertificateRepository extends JpaRepository<IssuedCertificate, UUID> {

    Optional<IssuedCertificate> findTopByTypeOrderByCreatedAtDesc(CertificateType type);

    Page<IssuedCertificate> findAllByStudentIdOrderByCreatedAtDesc(UUID studentId, Pageable pageable);

    @Query("""
        SELECT c FROM IssuedCertificate c
        WHERE (:type IS NULL OR c.type = :type)
          AND (:q IS NULL OR :q = ''
               OR LOWER(c.student.user.firstName) LIKE %:q%
               OR LOWER(c.student.user.lastName)  LIKE %:q%
               OR LOWER(c.student.enrollmentNumber) LIKE %:q%
               OR LOWER(c.certificateNumber) LIKE %:q%)
        ORDER BY c.createdAt DESC
        """)
    Page<IssuedCertificate> search(
            @Param("type") CertificateType type,
            @Param("q") String query,
            Pageable pageable);
}