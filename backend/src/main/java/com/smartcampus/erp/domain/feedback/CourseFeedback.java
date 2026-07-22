package com.smartcampus.erp.domain.feedback;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.academic.FacultySubjectAssignment;
import com.smartcampus.erp.domain.academic.StudentProfile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A student's rating of one {@link FacultySubjectAssignment} — i.e. how a
 * specific faculty member taught a specific subject to a specific section
 * in a specific academic year. One student may rate a given assignment
 * only once (enforced by the unique constraint below), and feedback is
 * always shown to the faculty/admin without exposing the student's
 * identity — the {@code student} link exists purely to prevent duplicate
 * submissions, never to de-anonymise a rating in a response DTO.
 */
@Entity
@Table(
    name = "course_feedback",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "assignment_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseFeedback {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assignment_id", nullable = false)
    private FacultySubjectAssignment assignment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    // ── Ratings — each on a 1 (poor) to 5 (excellent) scale ─────────────────
    @Column(nullable = false)
    private int teachingQuality;

    @Column(nullable = false)
    private int syllabusCoverage;

    @Column(nullable = false)
    private int communicationSkills;

    @Column(nullable = false)
    private int punctuality;

    // Average of the four ratings above, precomputed at save-time so
    // aggregate queries (AVG across many rows) don't need to recompute it.
    @Column(nullable = false)
    private double overallRating;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @CreatedDate @Column(updatable = false) private LocalDateTime createdAt;
}