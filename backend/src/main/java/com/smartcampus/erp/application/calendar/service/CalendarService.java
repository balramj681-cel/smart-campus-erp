package com.smartcampus.erp.application.calendar.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.calendar.dto.CalendarEventResponse;
import com.smartcampus.erp.application.calendar.dto.CreateCalendarEventRequest;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.calendar.AcademicCalendarEvent;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.calendar.repository.CalendarEventRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final CalendarEventRepository calendarRepo;
    private final UserRepository          userRepo;

    // ── Month view (admin = all, others = published only) ─────────────────────

    public List<CalendarEventResponse> getForMonth(
            int year, int month, String academicYear, boolean isAdmin) {

        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd   = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

        List<AcademicCalendarEvent> events = isAdmin
                ? calendarRepo.findByMonthRange(monthStart, monthEnd, academicYear)
                : calendarRepo.findPublishedByMonthRange(monthStart, monthEnd, academicYear);

        return events.stream().map(this::toResponse).toList();
    }

    // ── Upcoming events (dashboard ke liye) ───────────────────────────────────

    public List<CalendarEventResponse> getUpcoming() {
        return calendarRepo.findUpcoming(LocalDate.now())
                .stream().map(this::toResponse).toList();
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public CalendarEventResponse create(CreateCalendarEventRequest req, String createdByEmail) {
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new IllegalArgumentException("End date start date se pehle nahi ho sakti.");
        }

        User creator = userRepo.findByEmail(createdByEmail).orElse(null);

        return toResponse(calendarRepo.save(AcademicCalendarEvent.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .eventType(req.getEventType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .academicYear(req.getAcademicYear())
                .published(req.isPublished())
                .isHoliday(req.isHoliday())
                .createdBy(creator)
                .build()));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Transactional
    public CalendarEventResponse update(UUID id, CreateCalendarEventRequest req) {
        AcademicCalendarEvent event = findOrThrow(id);
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setEventType(req.getEventType());
        event.setStartDate(req.getStartDate());
        event.setEndDate(req.getEndDate());
        event.setAcademicYear(req.getAcademicYear());
        event.setPublished(req.isPublished());
        event.setHoliday(req.isHoliday());
        return toResponse(calendarRepo.save(event));
    }

    // ── Toggle publish ────────────────────────────────────────────────────────

    @Transactional
    public CalendarEventResponse togglePublish(UUID id) {
        AcademicCalendarEvent event = findOrThrow(id);
        event.setPublished(!event.isPublished());
        return toResponse(calendarRepo.save(event));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) { calendarRepo.deleteById(id); }

    // ── Helper ────────────────────────────────────────────────────────────────

    private AcademicCalendarEvent findOrThrow(UUID id) {
        return calendarRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + id));
    }

    private CalendarEventResponse toResponse(AcademicCalendarEvent e) {
        long days = ChronoUnit.DAYS.between(e.getStartDate(), e.getEndDate()) + 1;
        return CalendarEventResponse.builder()
                .id(e.getId())
                .title(e.getTitle())
                .description(e.getDescription())
                .eventType(e.getEventType())
                .eventTypeDisplay(e.getEventType().getDisplayName())
                .color(e.getEventType().getColor())
                .emoji(e.getEventType().getEmoji())
                .startDate(e.getStartDate())
                .endDate(e.getEndDate())
                .multiDay(days > 1)
                .durationDays((int) days)
                .academicYear(e.getAcademicYear())
                .published(e.isPublished())
                .isHoliday(e.isHoliday())
                .createdByName(e.getCreatedBy() != null
                        ? e.getCreatedBy().getFirstName() + " " + e.getCreatedBy().getLastName()
                        : "System")
                .createdAt(e.getCreatedAt())
                .build();
    }
}