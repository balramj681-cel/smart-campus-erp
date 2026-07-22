package com.smartcampus.erp.infrastructure.persistence.coursework.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.coursework.Assignment;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {

    @Query("""
        SELECT a FROM Assignment a
        WHERE (:sectionId    IS NULL OR a.section.id     = :sectionId)
          AND (:subjectId    IS NULL OR a.subject.id     = :subjectId)
          AND (:facultyId    IS NULL OR a.faculty.id     = :facultyId)
          AND (:academicYear IS NULL OR a.academicYear   = :academicYear)
        ORDER BY a.createdAt DESC
        """)
    Page<Assignment> search(
            @Param("sectionId")    UUID   sectionId,
            @Param("subjectId")    UUID   subjectId,
            @Param("facultyId")    UUID   facultyId,
            @Param("academicYear") String academicYear,
            Pageable pageable);

    List<Assignment> findAllBySectionIdAndAcademicYearAndActiveTrueOrderByDueDateAsc(
            UUID sectionId, String academicYear);
}