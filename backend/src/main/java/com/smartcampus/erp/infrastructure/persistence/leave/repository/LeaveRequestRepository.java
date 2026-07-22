package com.smartcampus.erp.infrastructure.persistence.leave.repository;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.leave.LeaveRequest;
import com.smartcampus.erp.domain.shared.enums.LeaveStatus;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    Page<LeaveRequest> findAllByFacultyIdOrderByAppliedAtDesc(UUID facultyId, Pageable pageable);

    long countByFacultyIdAndStatus(UUID facultyId, LeaveStatus status);

    @Query("""
        SELECT COUNT(l) > 0 FROM LeaveRequest l
        WHERE l.faculty.id = :facultyId
          AND l.status IN ('PENDING', 'APPROVED')
          AND l.startDate <= :endDate
          AND l.endDate   >= :startDate
        """)
    boolean hasOverlappingLeave(
            @Param("facultyId") UUID facultyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate")   LocalDate endDate);

    @Query("""
        SELECT l FROM LeaveRequest l
        WHERE (:status    IS NULL OR l.status       = :status)
          AND (:facultyId IS NULL OR l.faculty.id   = :facultyId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(l.faculty.user.firstName) LIKE %:q%
               OR LOWER(l.faculty.user.lastName)  LIKE %:q%
               OR LOWER(l.faculty.employeeId)     LIKE %:q%)
        ORDER BY l.appliedAt DESC
        """)
    Page<LeaveRequest> search(
            @Param("q")         String      query,
            @Param("status")    LeaveStatus status,
            @Param("facultyId") UUID        facultyId,
            Pageable pageable);

    long countByStatus(LeaveStatus status);

    // Used to suppress a faculty member's schedule (timetable-for-date,
    // attendance auto-load) on days they have an approved leave covering.
    @Query("""
        SELECT COUNT(l) > 0 FROM LeaveRequest l
        WHERE l.faculty.id = :facultyId
          AND l.status = 'APPROVED'
          AND l.startDate <= :date
          AND l.endDate   >= :date
        """)
    boolean isFacultyOnApprovedLeave(
            @Param("facultyId") UUID facultyId,
            @Param("date")      LocalDate date);
}