package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.StudentProfile;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {

    boolean existsByEnrollmentNumber(String enrollmentNumber);

    boolean existsByUserId(UUID userId);

    Optional<StudentProfile> findByUserId(UUID userId);

    @Query("""
        SELECT s FROM StudentProfile s
        WHERE (:batch IS NULL OR s.batch = :batch)
          AND (:q IS NULL OR :q = ''
               OR LOWER(s.user.firstName) LIKE %:q%
               OR LOWER(s.user.lastName)  LIKE %:q%
               OR LOWER(s.user.email)     LIKE %:q%
               OR LOWER(s.enrollmentNumber) LIKE %:q%)
        """)
    Page<StudentProfile> search(
            @Param("q")     String  query,
            @Param("batch") Integer batch,
            Pageable pageable);

    long countByBatch(int batch);

    long countByCurrentSectionId(UUID sectionId);

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE s.currentSection.semester.program.department.id = :deptId")
    long countByDepartmentId(@Param("deptId") UUID departmentId);

    List<StudentProfile> findAllByCurrentSectionIdOrderByUserFirstNameAsc(UUID sectionId);


    @org.springframework.data.jpa.repository.Query(
        "SELECT s FROM StudentProfile s WHERE s.user.email = :email")
    java.util.Optional<StudentProfile> findByUserEmail(
        @org.springframework.data.repository.query.Param("email") String email);
}