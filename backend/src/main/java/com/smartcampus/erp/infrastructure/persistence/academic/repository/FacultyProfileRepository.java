package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.shared.enums.Designation;


@Repository
public interface FacultyProfileRepository extends JpaRepository<FacultyProfile, UUID> {

    boolean existsByEmployeeId(String employeeId);

    boolean existsByUserId(UUID userId);

    long countByDepartmentId(UUID departmentId);

    long countByDesignation(Designation designation);

    @Query("""
        SELECT f FROM FacultyProfile f
        WHERE (:deptId IS NULL OR f.department.id = :deptId)
          AND (:designation IS NULL OR f.designation = :designation)
          AND (:q IS NULL OR :q = ''
               OR LOWER(f.user.firstName)  LIKE %:q%
               OR LOWER(f.user.lastName)   LIKE %:q%
               OR LOWER(f.user.email)      LIKE %:q%
               OR LOWER(f.employeeId)      LIKE %:q%
               OR LOWER(f.specialization)  LIKE %:q%)
        """)
    Page<FacultyProfile> search(
            @Param("q") String query,
            @Param("deptId") UUID departmentId,
            @Param("designation") Designation designation,
            Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
            "SELECT f FROM FacultyProfile f WHERE f.user.email = :email")
    java.util.Optional<FacultyProfile> findByUserEmail(
            @org.springframework.data.repository.query.Param("email") String email);

            java.util.Optional<FacultyProfile> findByUserId(UUID userId);
}
