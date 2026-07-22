package com.smartcampus.erp.infrastructure.persistence.coursework.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.coursework.AssignmentSubmission;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, UUID> {

    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);

    List<AssignmentSubmission> findAllByAssignmentIdOrderBySubmittedAtDesc(UUID assignmentId);

    List<AssignmentSubmission> findAllByStudentIdOrderBySubmittedAtDesc(UUID studentId);

    long countByAssignmentId(UUID assignmentId);
}