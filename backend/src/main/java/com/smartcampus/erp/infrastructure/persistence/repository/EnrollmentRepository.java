package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Enrollment;
import com.smartcampus.erp.domain.shared.enums.EnrollmentStatus;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findAllByStudentIdOrderByEnrolledAtDesc(UUID studentId);

    Optional<Enrollment> findByStudentIdAndStatus(UUID studentId, EnrollmentStatus status);
}