package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.AttendanceRecord;
import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {

    List<AttendanceRecord> findAllBySessionId(UUID sessionId);

    Optional<AttendanceRecord> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    @Query("""
        SELECT r FROM AttendanceRecord r
        JOIN FETCH r.session sess
        WHERE sess.id IN :sessionIds
        """)
    List<AttendanceRecord> findAllBySessionIdIn(@Param("sessionIds") List<UUID> sessionIds);

    @Query("""
        SELECT COUNT(r) FROM AttendanceRecord r
        JOIN r.session sess
        WHERE r.student.id   = :studentId
          AND sess.subject.id = :subjectId
          AND sess.section.id = :sectionId
          AND sess.academicYear = :year
          AND r.status        != :absent
        """)
    long countAttended(
            @Param("studentId") UUID             studentId,
            @Param("subjectId") UUID             subjectId,
            @Param("sectionId") UUID             sectionId,
            @Param("year")      String           year,
            @Param("absent")    AttendanceStatus absent);

    @Query("""
        SELECT COUNT(r) FROM AttendanceRecord r
        JOIN r.session sess
        WHERE r.student.id    = :studentId
          AND sess.subject.id = :subjectId
          AND sess.section.id = :sectionId
          AND sess.academicYear = :year
        """)
    long countTotal(
            @Param("studentId") UUID   studentId,
            @Param("subjectId") UUID   subjectId,
            @Param("sectionId") UUID   sectionId,
            @Param("year")      String year);
}