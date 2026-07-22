package com.smartcampus.erp.domain.academic;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Gender;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "faculty_profiles")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FacultyProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ── Linked user account ───────────────────────────────────────────────
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // ── Professional identity ─────────────────────────────────────────────
    @Column(nullable = false, unique = true, length = 30)
    private String employeeId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Designation designation;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    // ── Academic background ───────────────────────────────────────────────
    @Column(length = 200)
    private String qualification;

    @Column(length = 200)
    private String specialization;

    @Column(length = 500)
    private String researchInterests;

    @Builder.Default
    @Column(nullable = false)
    private int experienceYears = 0;

    // ── Personal details ──────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    private LocalDate dateOfBirth;
    private LocalDate joiningDate;

    @Column(length = 20)
    private String phone;

    @Column(length = 50)
    private String officeRoom;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate  @Column(updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate                        private LocalDateTime updatedAt;
}