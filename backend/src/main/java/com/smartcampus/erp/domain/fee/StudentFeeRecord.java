package com.smartcampus.erp.domain.fee;

import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.shared.enums.FeeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "student_fee_records",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"student_id", "fee_structure_id"}
    )
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudentFeeRecord {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "fee_structure_id", nullable = false)
    private FeeStructure feeStructure;

    @Column(nullable = false)
    private double totalAmount;

    @Builder.Default
    @Column(nullable = false)
    private double paidAmount = 0.0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private FeeStatus status = FeeStatus.PENDING;

    @Column(length = 300)
    private String remarks;

    @Builder.Default
    @OneToMany(mappedBy = "studentFeeRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FeePayment> payments = new ArrayList<>();

    @CreatedDate  @Column(updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate                        private LocalDateTime updatedAt;

    // ── Computed helpers ──────────────────────────────────────────────────
    public double getDueAmount() { return Math.max(0, totalAmount - paidAmount); }
}