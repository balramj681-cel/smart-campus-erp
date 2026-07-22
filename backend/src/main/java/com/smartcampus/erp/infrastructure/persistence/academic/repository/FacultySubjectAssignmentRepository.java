package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.FacultySubjectAssignment;

@Repository
public interface FacultySubjectAssignmentRepository
        extends JpaRepository<FacultySubjectAssignment, UUID> {

    boolean existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
            UUID facultyId, UUID subjectId, UUID sectionId, String academicYear);

    List<FacultySubjectAssignment> findAllBySubjectIdAndAcademicYear(
            UUID subjectId, String academicYear);

    List<FacultySubjectAssignment> findAllByFacultyIdAndAcademicYear(
            UUID facultyId, String academicYear);

    @Query("""
        SELECT a FROM FacultySubjectAssignment a
        WHERE (:year    IS NULL OR a.academicYear          = :year)
          AND (:subId   IS NULL OR a.subject.id            = :subId)
          AND (:secId   IS NULL OR a.section.id            = :secId)
          AND (:facId   IS NULL OR a.faculty.id            = :facId)
        """)
    Page<FacultySubjectAssignment> search(
            @Param("year")  String year,
            @Param("subId") UUID   subjectId,
            @Param("secId") UUID   sectionId,
            @Param("facId") UUID   facultyId,
            Pageable pageable);
}