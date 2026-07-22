package com.smartcampus.erp.domain.academic;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.smartcampus.erp.domain.shared.enums.WeekDay;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "timetable_entries",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_section_day_period_year_week",
                    columnNames = {"section_id", "day_of_week", "period_number", "academic_year", "week_of"}
            )
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "faculty_id", nullable = false)
    private FacultyProfile faculty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private WeekDay dayOfWeek;

    @Column(nullable = false)
    private int periodNumber;       // 1–8

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(length = 20)
    private String roomNumber;

    @Column(nullable = false, length = 10)
    private String academicYear;    // e.g. "2024-25"

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;

    // null = har hafte repeat hoga (recurring)
    // date set = sirf us specific week ke liye
    @Column
    private java.time.LocalDate weekOf;  // Monday of that week (e.g., 2024-01-08)

    // Sirf week-specific entries (weekOf != null) pe meaningful — "is hafte class cancel hai"
    @Builder.Default
    @Column(nullable = false)
    private boolean cancelled = false;
}
