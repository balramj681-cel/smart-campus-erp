package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.StudentMark;

@Repository
public interface StudentMarkRepository extends JpaRepository<StudentMark, UUID> {

    List<StudentMark> findAllByExamComponentId(UUID componentId);

    Optional<StudentMark> findByExamComponentIdAndStudentId(UUID componentId, UUID studentId);

    @Query("""
        SELECT sm FROM StudentMark sm
        JOIN sm.examComponent ec
        WHERE sm.student.id   = :studentId
          AND ec.section.id   = :sectionId
          AND ec.academicYear = :year
        ORDER BY ec.subject.name, ec.examType
        """)
    List<StudentMark> findAllForStudentInSection(
            @Param("studentId") UUID   studentId,
            @Param("sectionId") UUID   sectionId,
            @Param("year")      String academicYear);

    @Query("""
        SELECT sm FROM StudentMark sm
        JOIN FETCH sm.student s
        JOIN FETCH s.user
        WHERE sm.examComponent.id = :componentId
        ORDER BY s.user.firstName
        """)
    List<StudentMark> findAllWithStudentByComponentId(@Param("componentId") UUID componentId);
}