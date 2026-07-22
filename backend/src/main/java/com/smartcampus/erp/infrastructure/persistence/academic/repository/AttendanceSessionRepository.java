package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.AttendanceSession;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, UUID> {

    boolean existsBySectionIdAndSubjectIdAndSessionDateAndAcademicYearAndPeriodNumber(
        UUID sectionId, UUID subjectId, LocalDate sessionDate, String academicYear, Integer periodNumber);

    // existsBySectionIdAndSubjectIdAndSessionDateAndAcademicYear ke NEECHE add karo:
    Optional<AttendanceSession> findByQrToken(String qrToken);

    Optional<AttendanceSession> findBySectionIdAndSubjectIdAndSessionDateAndAcademicYear(
            UUID sectionId, UUID subjectId, LocalDate date, String year);

    List<AttendanceSession> findAllBySectionIdAndAcademicYearOrderBySessionDateDesc(
            UUID sectionId, String academicYear);

    @Query("""
        SELECT s FROM AttendanceSession s
        WHERE (:sectionId IS NULL OR s.section.id  = :sectionId)
          AND (:subjectId IS NULL OR s.subject.id  = :subjectId)
          AND (:facultyId IS NULL OR s.faculty.id  = :facultyId)
          AND (:year      IS NULL OR s.academicYear = :year)
          AND (:from      IS NULL OR s.sessionDate >= :from)
          AND (:to        IS NULL OR s.sessionDate <= :to)
        ORDER BY s.sessionDate DESC
        """)
    Page<AttendanceSession> search(
            @Param("sectionId") UUID sectionId,
            @Param("subjectId") UUID subjectId,
            @Param("facultyId") UUID facultyId,
            @Param("year") String academicYear,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);
}
