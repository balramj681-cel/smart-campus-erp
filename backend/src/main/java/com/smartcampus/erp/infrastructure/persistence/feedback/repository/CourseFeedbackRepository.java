package com.smartcampus.erp.infrastructure.persistence.feedback.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.feedback.CourseFeedback;

@Repository
public interface CourseFeedbackRepository extends JpaRepository<CourseFeedback, UUID> {

    boolean existsByStudentIdAndAssignmentId(UUID studentId, UUID assignmentId);
    // existsByStudentIdAndAssignmentId ke NEECHE ye line add karo:
    List<CourseFeedback> findAllByStudentId(UUID studentId);

    List<CourseFeedback> findAllByAssignmentId(UUID assignmentId);

    // Har assignment jo is faculty ki hai, unke saare feedback
    @Query("SELECT f FROM CourseFeedback f WHERE f.assignment.faculty.id = :facultyId")
    List<CourseFeedback> findAllByFacultyId(@Param("facultyId") UUID facultyId);

    @Query("SELECT AVG(f.overallRating) FROM CourseFeedback f WHERE f.assignment.id = :assignmentId")
    Double averageForAssignment(@Param("assignmentId") UUID assignmentId);

    @Query("SELECT AVG(f.overallRating) FROM CourseFeedback f WHERE f.assignment.faculty.id = :facultyId")
    Double averageForFaculty(@Param("facultyId") UUID facultyId);

    @Query("SELECT COUNT(f) FROM CourseFeedback f WHERE f.assignment.id = :assignmentId")
    long countForAssignment(@Param("assignmentId") UUID assignmentId);

    // Admin-wide report — ek row per faculty, unki assignments ke IDs
    @Query("SELECT DISTINCT f.assignment.faculty.id FROM CourseFeedback f")
    List<UUID> findDistinctRatedFacultyIds();
}