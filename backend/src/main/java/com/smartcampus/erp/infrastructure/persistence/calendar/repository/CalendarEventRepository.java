package com.smartcampus.erp.infrastructure.persistence.calendar.repository;

import com.smartcampus.erp.domain.calendar.AcademicCalendarEvent;
import com.smartcampus.erp.domain.shared.enums.CalendarEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<AcademicCalendarEvent, UUID> {

    // Month ke events
    @Query("""
        SELECT e FROM AcademicCalendarEvent e
        WHERE e.startDate <= :monthEnd
          AND e.endDate   >= :monthStart
          AND (:year IS NULL OR e.academicYear IS NULL OR e.academicYear = :year)
        ORDER BY e.startDate ASC
        """)
    List<AcademicCalendarEvent> findByMonthRange(
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd")   LocalDate monthEnd,
            @Param("year")       String    academicYear);

    // Published events only (students ke liye)
    @Query("""
        SELECT e FROM AcademicCalendarEvent e
        WHERE e.published  = true
          AND e.startDate <= :monthEnd
          AND e.endDate   >= :monthStart
          AND (:year IS NULL OR e.academicYear IS NULL OR e.academicYear = :year)
        ORDER BY e.startDate ASC
        """)
    List<AcademicCalendarEvent> findPublishedByMonthRange(
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd")   LocalDate monthEnd,
            @Param("year")       String    academicYear);

    // Date range events
    List<AcademicCalendarEvent> findAllByStartDateBetweenOrderByStartDateAsc(
            LocalDate from, LocalDate to);

    // Upcoming events
    @Query("""
        SELECT e FROM AcademicCalendarEvent e
        WHERE e.published  = true
          AND e.startDate >= :today
        ORDER BY e.startDate ASC
        LIMIT 10
        """)
    List<AcademicCalendarEvent> findUpcoming(@Param("today") LocalDate today);
}