package com.smartcampus.erp.domain.coursework;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.shared.enums.SubmissionStatus;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One student's file upload against one {@link Assignment}. A student may
 * resubmit (row updated in place, not duplicated) up until it's graded —
 * enforced via the unique constraint on (assignment_id, student_id).
 */
@Entity
@Table(name = "assignment_submissions",
       uniqueConstraints = @UniqueConstraint(columnNames = { "assignment_id", "student_id" }))
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssignmentSubmission {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(nullable = false, length = 255)
    private String originalFileName;

    // The name the file is actually saved under on disk — a generated UUID
    // + extension, so two students uploading "assignment1.pdf" never collide.
    @Column(nullable = false, length = 255)
    private String storedFileName;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false, length = 150)
    private String contentType;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    private Integer marksObtained;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    private LocalDateTime gradedAt;

    @CreatedDate @Column(updatable = false) private LocalDateTime submittedAt;
}