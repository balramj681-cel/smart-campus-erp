package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Semester;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, UUID> {
    List<Semester> findAllByProgramIdOrderBySemesterNumberAsc(UUID programId);
    boolean existsByProgramIdAndSemesterNumber(UUID programId, int semesterNumber);
}