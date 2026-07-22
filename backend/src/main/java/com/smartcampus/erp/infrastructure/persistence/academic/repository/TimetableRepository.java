package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.TimetableEntry;
import com.smartcampus.erp.domain.shared.enums.WeekDay;

@Repository
public interface TimetableRepository extends JpaRepository<TimetableEntry, UUID> {

    // ── Section ka poora timetable ────────────────────────────────────────
    List<TimetableEntry> findAllBySectionIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
            UUID sectionId, String academicYear);

    // ── Faculty ka poora timetable ────────────────────────────────────────
    List<TimetableEntry> findAllByFacultyIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
            UUID facultyId, String academicYear);

    // ── Section conflict check ────────────────────────────────────────────
    boolean existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYear(
            UUID sectionId, WeekDay day, int period, String year);

    // ── Faculty double-booking check (update ke waqt khud ko exclude karo)
    @Query("""
    SELECT COUNT(t) > 0 FROM TimetableEntry t
    WHERE t.faculty.id   = :facultyId
      AND t.dayOfWeek    = :day
      AND t.periodNumber = :period
      AND t.academicYear = :year
      AND t.id          != :excludeId
      AND t.weekOf IS NULL
    """)
    boolean isFacultyDoubleBookedRecurring(
            @Param("facultyId") UUID facultyId,
            @Param("day") WeekDay day,
            @Param("period") int period,
            @Param("year") String year,
            @Param("excludeId") UUID excludeId);

    @Query("""
    SELECT COUNT(t) > 0 FROM TimetableEntry t
    WHERE t.faculty.id   = :facultyId
      AND t.dayOfWeek    = :day
      AND t.periodNumber = :period
      AND t.academicYear = :year
      AND t.id          != :excludeId
      AND t.weekOf = :weekOf
    """)
    boolean isFacultyDoubleBookedForWeek(
            @Param("facultyId") UUID facultyId,
            @Param("day") WeekDay day,
            @Param("period") int period,
            @Param("year") String year,
            @Param("weekOf") java.time.LocalDate weekOf,
            @Param("excludeId") UUID excludeId);

    // ── Section conflict check (update ke waqt)
    @Query("""
        SELECT COUNT(t) > 0 FROM TimetableEntry t
        WHERE t.section.id   = :sectionId
          AND t.dayOfWeek    = :day
          AND t.periodNumber = :period
          AND t.academicYear = :year
          AND t.id          != :excludeId
        """)
    boolean isSectionSlotTaken(
            @Param("sectionId") UUID sectionId,
            @Param("day") WeekDay day,
            @Param("period") int period,
            @Param("year") String year,
            @Param("excludeId") UUID excludeId);

    boolean existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
            UUID facultyId, UUID subjectId, UUID sectionId, String academicYear);

    // ── Week-aware date query (Bug 4) ─────────────────────────────────────────
    // Specific date ke liye: pehle week-specific entries, phir recurring
    @org.springframework.data.jpa.repository.Query("""
        SELECT t FROM TimetableEntry t
        WHERE t.section.id   = :sectionId
          AND t.academicYear = :year
          AND t.dayOfWeek    = :day
          AND t.active       = true
          AND (t.weekOf IS NULL OR t.weekOf = :weekOf)
        ORDER BY t.weekOf DESC NULLS LAST, t.periodNumber ASC
        """)
    List<TimetableEntry> findForDateWithFallback(
            @org.springframework.data.repository.query.Param("sectionId") UUID sectionId,
            @org.springframework.data.repository.query.Param("year") String academicYear,
            @org.springframework.data.repository.query.Param("day") com.smartcampus.erp.domain.shared.enums.WeekDay day,
            @org.springframework.data.repository.query.Param("weekOf") java.time.LocalDate weekOf);

    // Faculty ke liye week-aware
    @org.springframework.data.jpa.repository.Query("""
        SELECT t FROM TimetableEntry t
        WHERE t.faculty.id   = :facultyId
          AND t.academicYear = :year
          AND t.dayOfWeek    = :day
          AND t.active       = true
          AND (t.weekOf IS NULL OR t.weekOf = :weekOf)
        ORDER BY t.weekOf DESC NULLS LAST, t.periodNumber ASC
        """)
    List<TimetableEntry> findForFacultyDateWithFallback(
            @org.springframework.data.repository.query.Param("facultyId") UUID facultyId,
            @org.springframework.data.repository.query.Param("year") String academicYear,
            @org.springframework.data.repository.query.Param("day") com.smartcampus.erp.domain.shared.enums.WeekDay day,
            @org.springframework.data.repository.query.Param("weekOf") java.time.LocalDate weekOf);

    // Recurring slot ka conflict-check (sirf weekOf=null entries ke against)
    boolean existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOfIsNull(
            UUID sectionId, WeekDay day, int period, String year);

// Specific-week override ka conflict-check
    boolean existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOf(
            UUID sectionId, WeekDay day, int period, String year, java.time.LocalDate weekOf);

// Ek specific week ke override ko dhoondo (cancel/edit ke liye)
    java.util.Optional<TimetableEntry> findBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOf(
            UUID sectionId, WeekDay day, int period, String year, java.time.LocalDate weekOf);

// Poore HAFTE ka data — recurring + is week ke overrides dono (Section ke liye)
    @org.springframework.data.jpa.repository.Query("""
    SELECT t FROM TimetableEntry t
    WHERE t.section.id   = :sectionId
      AND t.academicYear = :year
      AND t.active       = true
      AND (t.weekOf IS NULL OR t.weekOf = :weekOf)
    ORDER BY t.weekOf DESC NULLS LAST, t.dayOfWeek ASC, t.periodNumber ASC
    """)
    List<TimetableEntry> findWeekWithFallback(
            @org.springframework.data.repository.query.Param("sectionId") UUID sectionId,
            @org.springframework.data.repository.query.Param("year") String academicYear,
            @org.springframework.data.repository.query.Param("weekOf") java.time.LocalDate weekOf);



            @Query("""
    SELECT t FROM TimetableEntry t
    WHERE t.faculty.id   = :facultyId
      AND t.academicYear = :year
      AND t.active       = true
      AND (t.weekOf IS NULL OR t.weekOf = :weekOf)
    ORDER BY t.weekOf DESC NULLS LAST, t.dayOfWeek ASC, t.periodNumber ASC
    """)
List<TimetableEntry> findFacultyWeekWithFallback(
        @Param("facultyId") UUID facultyId,
        @Param("year") String academicYear,
        @Param("weekOf") java.time.LocalDate weekOf);
}
