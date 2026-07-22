package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.ExamDebarment;

@Repository
public interface ExamDebarmentRepository extends JpaRepository<ExamDebarment, UUID> {

    boolean existsByStudentIdAndSectionIdAndSubjectIdAndAcademicYearAndActiveTrue(
            UUID studentId, UUID sectionId, UUID subjectId, String academicYear);

    Optional<ExamDebarment> findByStudentIdAndSectionIdAndSubjectIdAndAcademicYear(
            UUID studentId, UUID sectionId, UUID subjectId, String academicYear);

    List<ExamDebarment> findAllBySectionIdAndAcademicYearAndActiveTrue(
            UUID sectionId, String academicYear);
}