package com.smartcampus.erp.domain.academic;

import com.smartcampus.erp.domain.shared.enums.ExamType;
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
@Table(
    name = "exam_components",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"section_id", "subject_id", "exam_type", "academic_year"}
    )
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamComponent {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "faculty_id")
    private FacultyProfile faculty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamType examType;

    @Column(nullable = false)
    private int maxMarks;

    // Weightage toward final result (0–100, sum across components = 100)
    @Builder.Default
    @Column(nullable = false)
    private double weightage = 0.0;

    @Column(nullable = false, length = 10)
    private String academicYear;

    private LocalDate scheduledDate;

    @Builder.Default
    @Column(nullable = false)
    private boolean published = false;

    @Builder.Default
    @OneToMany(mappedBy = "examComponent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudentMark> marks = new ArrayList<>();

    @CreatedDate  @Column(updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate                        private LocalDateTime updatedAt;
}