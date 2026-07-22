package com.smartcampus.erp.presentation.calendar;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.calendar.dto.CalendarEventResponse;
import com.smartcampus.erp.application.calendar.dto.CreateCalendarEventRequest;
import com.smartcampus.erp.application.calendar.service.CalendarService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    // ── Month view ────────────────────────────────────────────────────────────
    @GetMapping("/month")
    public ResponseEntity<List<CalendarEventResponse>> getMonth(
            @RequestParam int    year,
            @RequestParam int    month,
            @RequestParam(required = false) String academicYear,
            Authentication auth) {

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") ||
                               a.getAuthority().equals("ROLE_SUPER_ADMIN") ||
                               a.getAuthority().equals("ROLE_HOD"));

        return ResponseEntity.ok(
                calendarService.getForMonth(year, month, academicYear, isAdmin));
    }

    // ── Upcoming (dashboard widget) ───────────────────────────────────────────
    @GetMapping("/upcoming")
    public ResponseEntity<List<CalendarEventResponse>> getUpcoming() {
        return ResponseEntity.ok(calendarService.getUpcoming());
    }

    // ── Create ────────────────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<CalendarEventResponse> create(
            @Valid @RequestBody CreateCalendarEventRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(calendarService.create(req, auth.getName()));
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD')")
    public ResponseEntity<CalendarEventResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCalendarEventRequest req) {
        return ResponseEntity.ok(calendarService.update(id, req));
    }

    // ── Toggle publish ────────────────────────────────────────────────────────
    @PatchMapping("/{id}/toggle-publish")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<CalendarEventResponse> togglePublish(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarService.togglePublish(id));
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        calendarService.delete(id);
        return ResponseEntity.noContent().build();
    }
}