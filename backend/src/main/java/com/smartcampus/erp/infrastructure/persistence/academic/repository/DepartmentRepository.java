package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Department;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    boolean existsByCode(String code);
    boolean existsByName(String name);
    List<Department> findAllByOrderByNameAsc();
}