package com.smartcampus.erp.domain.academic;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.BloodGroup;
import com.smartcampus.erp.domain.shared.enums.Gender;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "student_profiles")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Linked user account ────────────────────────────────────────────────
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // ── Academic identity ──────────────────────────────────────────────────
    @Column(nullable = false, unique = true, length = 30)
    private String enrollmentNumber;

    @Column(nullable = false)
    private int batch;

    private LocalDate admissionDate;

    // ── Current section (active enrollment) ────────────────────────────────
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "current_section_id")
    private Section currentSection;

    // ── Personal details ───────────────────────────────────────────────────
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private BloodGroup bloodGroup;

    @Column(length = 20)
    private String phone;

    @Column(length = 300)
    private String address;

    // ── Guardian ───────────────────────────────────────────────────────────
    @Column(length = 100)
    private String guardianName;

    @Column(length = 20)
    private String guardianContact;

    // ── Enrollment history ─────────────────────────────────────────────────
    @Builder.Default
    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Enrollment> enrollments = new ArrayList<>();

    @CreatedDate  @Column(updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate                        private LocalDateTime updatedAt;
}