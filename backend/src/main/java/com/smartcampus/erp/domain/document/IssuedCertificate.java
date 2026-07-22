package com.smartcampus.erp.domain.document;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.CertificateType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An audit record of one certificate that was issued to a student. The PDF
 * itself is never stored as a blob — it's cheap to regenerate on demand
 * from this row plus the student's current profile, so only the metadata
 * (who, what type, when, why, by whom) is persisted.
 */
@Entity
@Table(name = "issued_certificates")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IssuedCertificate {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String certificateNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateType type;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(length = 500)
    private String purpose;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "issued_by", nullable = false)
    private User issuedBy;

    @CreatedDate @Column(updatable = false) private LocalDateTime createdAt;
}