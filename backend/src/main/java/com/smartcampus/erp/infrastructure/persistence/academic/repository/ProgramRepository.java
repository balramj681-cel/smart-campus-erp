package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Program;

@Repository
public interface ProgramRepository extends JpaRepository<Program, UUID> {
    List<Program> findAllByDepartmentIdOrderByNameAsc(UUID departmentId);
    List<Program> findAllByOrderByNameAsc();
    boolean existsByCodeAndDepartmentId(String code, UUID departmentId);
}