package com.smartcampus.erp.infrastructure.persistence.exam.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.exam.ExamSchedule;
import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.domain.shared.enums.ExamType;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {

    // Section ka full schedule
    List<ExamSchedule> findAllBySectionIdAndAcademicYearOrderByExamDateAscStartTimeAsc(
            UUID sectionId, String academicYear);

    // Hall ticket ke liye — section + year + optional examType
    List<ExamSchedule> findAllBySectionIdAndAcademicYearAndExamTypeOrderByExamDateAscStartTimeAsc(
            UUID sectionId, String academicYear, ExamType examType);

    // Timetable integration
    List<ExamSchedule> findAllBySectionIdAndExamDateAndAcademicYear(
            UUID sectionId, LocalDate date, String academicYear);

    // Paginated search
    @Query("""
        SELECT e FROM ExamSchedule e
        WHERE (:sectionId IS NULL OR e.section.id  = :sectionId)
          AND (:status    IS NULL OR e.status       = :status)
          AND (:examType  IS NULL OR e.examType     = :examType)
          AND (:year      IS NULL OR e.academicYear = :year)
          AND (:from      IS NULL OR e.examDate    >= :from)
          AND (:to        IS NULL OR e.examDate    <= :to)
        ORDER BY e.examDate ASC, e.startTime ASC
        """)
    Page<ExamSchedule> search(
            @Param("sectionId") UUID       sectionId,
            @Param("status")    ExamStatus status,
            @Param("examType")  ExamType   examType,
            @Param("year")      String     academicYear,
            @Param("from")      LocalDate  from,
            @Param("to")        LocalDate  to,
            Pageable pageable);

    // Time conflict check
    @Query("""
        SELECT COUNT(e) > 0 FROM ExamSchedule e
        WHERE e.section.id   = :secId
          AND e.examDate     = :date
          AND e.academicYear = :year
          AND e.startTime    < :endTime
          AND e.endTime      > :startTime
          AND e.id          != :excludeId
        """)
    boolean hasConflict(
            @Param("secId")     UUID      sectionId,
            @Param("date")      LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime")   LocalTime endTime,
            @Param("year")      String    academicYear,
            @Param("excludeId") UUID      excludeId);
}