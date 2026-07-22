package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.ExamComponent;

@Repository
public interface ExamComponentRepository extends JpaRepository<ExamComponent, UUID> {

    List<ExamComponent> findAllBySectionIdAndAcademicYearOrderBySubjectNameAscExamTypeAsc(
            UUID sectionId, String academicYear);

    List<ExamComponent> findAllBySectionIdAndSubjectIdAndAcademicYear(
            UUID sectionId, UUID subjectId, String academicYear);

    boolean existsBySectionIdAndSubjectIdAndExamTypeAndAcademicYear(
            UUID sectionId, UUID subjectId,
            com.smartcampus.erp.domain.shared.enums.ExamType examType,
            String academicYear);

    @Query("""
        SELECT ec FROM ExamComponent ec
        WHERE ec.section.id  = :secId
          AND ec.subject.id  = :subId
          AND ec.academicYear = :year
        ORDER BY ec.examType
        """)
    List<ExamComponent> findForSubjectInSection(
            @Param("secId") UUID   sectionId,
            @Param("subId") UUID   subjectId,
            @Param("year")  String academicYear);
}