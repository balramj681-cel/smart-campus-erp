package com.smartcampus.erp.infrastructure.persistence.fee.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.fee.FeeStructure;

@Repository
public interface FeeStructureRepository extends JpaRepository<FeeStructure, UUID> {
    List<FeeStructure> findAllByOrderByCreatedAtDesc();
    List<FeeStructure> findAllByProgramIdOrderByBatchDesc(UUID programId);
    boolean existsByProgramIdAndBatchAndAcademicYear(UUID programId, int batch, String year);
}