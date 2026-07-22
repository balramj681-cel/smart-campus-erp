package com.smartcampus.erp.application.timetable.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.timetable.dto.CreateTimetableEntryRequest;
import com.smartcampus.erp.application.timetable.dto.TimetableEntryResponse;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.academic.TimetableEntry;
import com.smartcampus.erp.domain.shared.enums.WeekDay;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.TimetableRepository;
import com.smartcampus.erp.infrastructure.persistence.leave.repository.LeaveRequestRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepo;
    private final SectionRepository sectionRepo;
    private final SubjectRepository subjectRepo;
    private final FacultyProfileRepository facultyRepo;
    private final LeaveRequestRepository leaveRepo;

    // ── Section ka timetable ──────────────────────────────────────────────
    public List<TimetableEntryResponse> getForSection(UUID sectionId, String academicYear) {
        return timetableRepo
                .findAllBySectionIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
                        sectionId, academicYear)
                .stream().map(e -> toResponse(e, null)).toList();
    }

    // ── Poore hafte ka grid — recurring + is week ke overrides merge karke ──
    public List<TimetableEntryResponse> getForSectionWeek(
            UUID sectionId, String academicYear, java.time.LocalDate weekOf) {

        List<TimetableEntry> all = timetableRepo.findWeekWithFallback(sectionId, academicYear, weekOf);

        // Dedupe: har (day, period) ke liye — week-specific entry recurring ko override karti hai
        java.util.Map<String, TimetableEntry> byDayPeriod = new java.util.LinkedHashMap<>();
        for (TimetableEntry e : all) {
            String key = e.getDayOfWeek() + "-" + e.getPeriodNumber();
            if (!byDayPeriod.containsKey(key) || e.getWeekOf() != null) {
                byDayPeriod.put(key, e);
            }
        }

        return byDayPeriod.values().stream()
                .sorted(java.util.Comparator.comparing(TimetableEntry::getDayOfWeek)
                        .thenComparingInt(TimetableEntry::getPeriodNumber))
                .map(e -> {
                    // Har entry apne HI din ki actual calendar date se check hona chahiye —
                    // Monday ki entry ho to weekOf hi sahi hai, lekin Wednesday ki entry ke
                    // liye Monday+2 din chahiye, warna leave-check galat din check karega.
                    java.time.LocalDate actualDate = weekOf.plusDays(e.getDayOfWeek().ordinal());
                    return toResponse(e, actualDate);
                })
                .toList();
    }

// ── Is hafte ke liye ek class cancel karo (recurring entry delete nahi hoti) ──
    @Transactional
    public TimetableEntryResponse cancelForWeek(UUID recurringEntryId, java.time.LocalDate weekOf) {
        TimetableEntry recurring = timetableRepo.findById(recurringEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));

        TimetableEntry override = timetableRepo
                .findBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOf(
                        recurring.getSection().getId(), recurring.getDayOfWeek(),
                        recurring.getPeriodNumber(), recurring.getAcademicYear(), weekOf)
                .orElse(null);

        if (override != null) {
            override.setCancelled(true);
            return toResponse(timetableRepo.save(override), weekOf);
        }

        TimetableEntry cancelledOverride = TimetableEntry.builder()
                .section(recurring.getSection()).subject(recurring.getSubject()).faculty(recurring.getFaculty())
                .dayOfWeek(recurring.getDayOfWeek()).periodNumber(recurring.getPeriodNumber())
                .startTime(recurring.getStartTime()).endTime(recurring.getEndTime())
                .roomNumber(recurring.getRoomNumber()).academicYear(recurring.getAcademicYear())
                .weekOf(weekOf).cancelled(true)
                .build();
        return toResponse(timetableRepo.save(cancelledOverride), weekOf);
    }

    // ── Faculty ka timetable ──────────────────────────────────────────────
    public List<TimetableEntryResponse> getForFaculty(UUID facultyId, String academicYear) {
        return timetableRepo
                .findAllByFacultyIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
                        facultyId, academicYear)
                .stream().map(e -> toResponse(e, null)).toList();
    }

    public List<TimetableEntryResponse> getForFacultyWeek(
            UUID facultyId, String academicYear, java.time.LocalDate weekOf) {

        List<TimetableEntry> all = timetableRepo.findFacultyWeekWithFallback(facultyId, academicYear, weekOf);

        java.util.Map<String, TimetableEntry> byDayPeriod = new java.util.LinkedHashMap<>();
        for (TimetableEntry e : all) {
            String key = e.getDayOfWeek() + "-" + e.getPeriodNumber();
            if (!byDayPeriod.containsKey(key) || e.getWeekOf() != null) {
                byDayPeriod.put(key, e);
            }
        }

        return byDayPeriod.values().stream()
                .sorted(java.util.Comparator.comparing(TimetableEntry::getDayOfWeek)
                        .thenComparingInt(TimetableEntry::getPeriodNumber))
                .map(e -> {
                    java.time.LocalDate actualDate = weekOf.plusDays(e.getDayOfWeek().ordinal());
                    return toResponse(e, actualDate);
                })
                .toList();
    }

// ── Timetable for a specific date ─────────────────────────────────────────
    // ── Week Monday calculate karo ────────────────────────────────────────────
    private static java.time.LocalDate getMondayOfWeek(java.time.LocalDate date) {
        return date.with(java.time.DayOfWeek.MONDAY);
    }

    // ── Date-wise (week-aware) ────────────────────────────────────────────────
    public List<TimetableEntryResponse> getForDate(UUID sectionId, java.time.LocalDate date, String academicYear) {
        WeekDay day;
        try {
            day = WeekDay.valueOf(date.getDayOfWeek().name());
        } catch (IllegalArgumentException e) {
            return java.util.List.of();
        }

        java.time.LocalDate weekOf = getMondayOfWeek(date);

        // Week-specific + recurring dono laao
        List<TimetableEntry> all = timetableRepo.findForDateWithFallback(
                sectionId, academicYear, day, weekOf);

        // Deduplicate: same period ke liye week-specific entry wins over recurring
        Map<Integer, TimetableEntry> byPeriod = new java.util.LinkedHashMap<>();
        for (TimetableEntry e : all) {
            int period = e.getPeriodNumber();
            if (!byPeriod.containsKey(period) || e.getWeekOf() != null) {
                byPeriod.put(period, e); // week-specific overrides recurring
            }
        }

        return byPeriod.values().stream()
                .sorted(java.util.Comparator.comparingInt(TimetableEntry::getPeriodNumber))
                .map(e -> toResponse(e, date)).toList();
    }

    // ── Create mein weekOf set karo ───────────────────────────────────────────
    // existing create() method mein builder mein add karo:
    // .weekOf(req.getWeekOf())
    // ── Create ────────────────────────────────────────────────────────────
    @Transactional
    public TimetableEntryResponse create(CreateTimetableEntryRequest req) {

        // 1. Slot conflict — recurring aur week-specific alag-alag check hote hain
        if (req.getWeekOf() == null) {
            if (timetableRepo.existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOfIsNull(
                    req.getSectionId(), req.getDayOfWeek(), req.getPeriodNumber(), req.getAcademicYear())) {
                throw new IllegalArgumentException(
                        "Section mein " + req.getDayOfWeek().getDisplayName()
                        + " Period " + req.getPeriodNumber() + " ka recurring slot pehle se occupied hai.");
            }
        } else {
            if (timetableRepo.existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOf(
                    req.getSectionId(), req.getDayOfWeek(), req.getPeriodNumber(),
                    req.getAcademicYear(), req.getWeekOf())) {
                throw new IllegalArgumentException(
                        "Is hafte (" + req.getWeekOf() + ") ke liye ye slot pehle se override ho chuka hai.");
            }
        }

        // 2. Faculty double-booking
        // 2. Faculty double-booking
        UUID nil = new UUID(0, 0);
        boolean doubleBooked = timetableRepo.isFacultyDoubleBookedRecurring(
                req.getFacultyId(), req.getDayOfWeek(), req.getPeriodNumber(), req.getAcademicYear(), nil)
                || (req.getWeekOf() != null && timetableRepo.isFacultyDoubleBookedForWeek(
                req.getFacultyId(), req.getDayOfWeek(), req.getPeriodNumber(),
                req.getAcademicYear(), req.getWeekOf(), nil));

        if (doubleBooked) {
            throw new IllegalArgumentException(
                    "Faculty is already busy on " + req.getDayOfWeek().getDisplayName()
                    + " Period " + req.getPeriodNumber() + " in another section.");
        }

        // 3. Faculty leave check — sirf specific-week entries ke liye
        if (req.getWeekOf() != null) {
            FacultyProfile facultyForLeaveCheck = findFaculty(req.getFacultyId());
            if (leaveRepo.isFacultyOnApprovedLeave(facultyForLeaveCheck.getId(), req.getWeekOf())) {
                throw new IllegalArgumentException(
                        "Ye faculty is date (" + req.getWeekOf() + ") ko approved leave par hai — class schedule nahi kar sakte.");
            }
        }

        Section section = findSection(req.getSectionId());
        Subject subject = findSubject(req.getSubjectId());
        FacultyProfile faculty = findFaculty(req.getFacultyId());

        return toResponse(timetableRepo.save(TimetableEntry.builder()
                .section(section).subject(subject).faculty(faculty)
                .dayOfWeek(req.getDayOfWeek()).periodNumber(req.getPeriodNumber())
                .startTime(req.getStartTime()).endTime(req.getEndTime())
                .roomNumber(req.getRoomNumber()).academicYear(req.getAcademicYear())
                .weekOf(req.getWeekOf())
                .build()), null);
    }

    // ── Update ────────────────────────────────────────────────────────────
    @Transactional
    public TimetableEntryResponse update(UUID id, CreateTimetableEntryRequest req) {
        TimetableEntry entry = timetableRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found: " + id));

        // Conflict check — khud ko exclude karo
        if (req.getWeekOf() == null) {
            if (timetableRepo.existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOfIsNull(
                    req.getSectionId(), req.getDayOfWeek(), req.getPeriodNumber(), req.getAcademicYear())) {
                throw new IllegalArgumentException(
                        "Section mein " + req.getDayOfWeek().getDisplayName()
                        + " Period " + req.getPeriodNumber() + " ka recurring slot pehle se occupied hai.");
            }
        } else {
            if (timetableRepo.existsBySectionIdAndDayOfWeekAndPeriodNumberAndAcademicYearAndWeekOf(
                    req.getSectionId(), req.getDayOfWeek(), req.getPeriodNumber(),
                    req.getAcademicYear(), req.getWeekOf())) {
                throw new IllegalArgumentException(
                        "Is hafte (" + req.getWeekOf() + ") ke liye ye slot pehle se override ho chuka hai.");
            }
        }
        boolean doubleBooked = timetableRepo.isFacultyDoubleBookedRecurring(
                req.getFacultyId(), req.getDayOfWeek(), req.getPeriodNumber(), req.getAcademicYear(), id)
                || (req.getWeekOf() != null && timetableRepo.isFacultyDoubleBookedForWeek(
                req.getFacultyId(), req.getDayOfWeek(), req.getPeriodNumber(),
                req.getAcademicYear(), req.getWeekOf(), id));

        if (doubleBooked) {
            throw new IllegalArgumentException(
                    "Faculty is already busy at this slot in another section.");
        }
        // Faculty leave check — agar us date pe faculty ki approved leave hai to schedule mat karne do
        if (req.getWeekOf() != null) {
            FacultyProfile facultyForLeaveCheck = findFaculty(req.getFacultyId());
            if (leaveRepo.isFacultyOnApprovedLeave(facultyForLeaveCheck.getId(), req.getWeekOf())) {
                throw new IllegalArgumentException(
                        "Ye faculty is date (" + req.getWeekOf() + ") ko approved leave par hai — class schedule nahi kar sakte.");
            }
        }

        entry.setSubject(findSubject(req.getSubjectId()));
        entry.setFaculty(findFaculty(req.getFacultyId()));
        entry.setDayOfWeek(req.getDayOfWeek());
        entry.setPeriodNumber(req.getPeriodNumber());
        entry.setStartTime(req.getStartTime());
        entry.setEndTime(req.getEndTime());
        entry.setRoomNumber(req.getRoomNumber());
        entry.setWeekOf(req.getWeekOf());

        return toResponse(timetableRepo.save(entry), null);
    }

    // ── Delete ────────────────────────────────────────────────────────────
    @Transactional
    public void delete(UUID id) {
        if (!timetableRepo.existsById(id)) {
            throw new IllegalArgumentException("Entry not found: " + id);
        }
        timetableRepo.deleteById(id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private Section findSection(UUID id) {
        return sectionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Section not found: " + id));
    }

    private Subject findSubject(UUID id) {
        return subjectRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + id));
    }

    private FacultyProfile findFaculty(UUID id) {
        return facultyRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found: " + id));
    }

    private TimetableEntryResponse toResponse(TimetableEntry t, java.time.LocalDate date) {
        Section sec = t.getSection();
        Semester sem = sec.getSemester();
        Subject sub = t.getSubject();
        FacultyProfile fac = t.getFaculty();

        // Only checked for a specific-date lookup (getForDate) — a plain
        // weekly-grid view (getForSection/getForFaculty) has no single date
        // to check leave against, so it's skipped there (date == null).
        boolean onLeave = date != null && leaveRepo.isFacultyOnApprovedLeave(fac.getId(), date);

        return TimetableEntryResponse.builder()
                .id(t.getId())
                .academicYear(t.getAcademicYear())
                .dayOfWeek(t.getDayOfWeek())
                .dayDisplayName(t.getDayOfWeek().getDisplayName())
                .periodNumber(t.getPeriodNumber())
                .startTime(t.getStartTime())
                .endTime(t.getEndTime())
                .roomNumber(t.getRoomNumber())
                .active(t.isActive())
                .subjectId(sub.getId())
                .subjectCode(sub.getCode())
                .subjectName(sub.getName())
                .subjectType(sub.getType().name())
                .facultyId(fac.getId())
                .facultyName(fac.getUser().getFirstName() + " " + fac.getUser().getLastName())
                .facultyEmployeeId(fac.getEmployeeId())
                .sectionId(sec.getId())
                .sectionName(sec.getName())
                .semesterId(sem.getId())
                .semesterName(sem.getName())
                .programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName())
                .weekOf(t.getWeekOf())
                .recurring(t.getWeekOf() == null)
                .cancelled(t.isCancelled())
                .facultyOnLeave(onLeave)
                .build();
    }
}
