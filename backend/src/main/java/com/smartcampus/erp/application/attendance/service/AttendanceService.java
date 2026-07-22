package com.smartcampus.erp.application.attendance.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.attendance.dto.AttendanceRecordResponse;
import com.smartcampus.erp.application.attendance.dto.AttendanceSessionResponse;
import com.smartcampus.erp.application.attendance.dto.AttendanceSummaryResponse;
import com.smartcampus.erp.application.attendance.dto.CreateAttendanceSessionRequest;
import com.smartcampus.erp.application.attendance.dto.MarkStudentRequest;
import com.smartcampus.erp.application.attendance.dto.SubjectAttendanceSummary;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.application.timetable.dto.TimetableEntryResponse;
import com.smartcampus.erp.domain.academic.AttendanceRecord;
import com.smartcampus.erp.domain.academic.AttendanceSession;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.academic.TimetableEntry;
import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.domain.shared.enums.WeekDay;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceRecordRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceSessionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultySubjectAssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.TimetableRepository;
import com.smartcampus.erp.infrastructure.persistence.leave.repository.LeaveRequestRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository recordRepo;
    private final StudentProfileRepository studentRepo;
    private final SectionRepository sectionRepo;
    private final SubjectRepository subjectRepo;
    private final FacultyProfileRepository facultyRepo;
    private final TimetableRepository timetableRepo;
    private final FacultySubjectAssignmentRepository assignmentRepo;
    private final NotificationService notificationService;
    private final LeaveRequestRepository leaveRepo;

    // ── 1. Faculty ka aaj ka schedule (auto-load) ─────────────────────────────
    public List<TimetableEntryResponse> getFacultyScheduleForDate(
            String userEmail, LocalDate date, String academicYear) {

        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));

        // On an approved leave day, there's nothing to mark — don't surface
// any periods for attendance-taking.
        /*
        if (leaveRepo.isFacultyOnApprovedLeave(faculty.getId(), date)) {
            return List.of();
        }
         */
        if (leaveRepo.isFacultyOnApprovedLeave(faculty.getId(), date)) {
            throw new IllegalArgumentException(
                    "Aapki " + date + " ko approved leave hai — is din ke liye attendance available nahi hai.");
        }

        WeekDay day;
        try {
            day = WeekDay.valueOf(date.getDayOfWeek().name());
        } catch (IllegalArgumentException e) {
            return List.of(); // Sunday ya invalid day
        }

        java.time.LocalDate weekOf = date.with(java.time.DayOfWeek.MONDAY);
        List<TimetableEntry> all = timetableRepo.findForFacultyDateWithFallback(
                faculty.getId(), academicYear, day, weekOf);

        Map<Integer, TimetableEntry> byPeriod = new java.util.LinkedHashMap<>();
        for (TimetableEntry e : all) {
            if (!byPeriod.containsKey(e.getPeriodNumber()) || e.getWeekOf() != null) {
                byPeriod.put(e.getPeriodNumber(), e);
            }
        }

        return byPeriod.values().stream()
                .filter(e -> !e.isCancelled())
                .sorted(Comparator.comparingInt(TimetableEntry::getPeriodNumber))
                .map(this::toTimetableResponse)
                .toList();
    }

    // ── 2. Section ke students (marking UI ke liye) ───────────────────────────
    public List<AttendanceRecordResponse> getStudentsForSection(UUID sectionId) {
        return studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(sectionId)
                .stream()
                .map(s -> AttendanceRecordResponse.builder()
                .studentId(s.getId())
                .studentName(s.getUser().getFirstName() + " " + s.getUser().getLastName())
                .enrollmentNumber(s.getEnrollmentNumber())
                .status(AttendanceStatus.PRESENT)
                .build())
                .toList();
    }

    // ── 3. Mark attendance (faculty check with ownership) ────────────────────
    @Transactional
    public AttendanceSessionResponse markAttendance(
            CreateAttendanceSessionRequest req,
            String userEmail,
            boolean isFacultyOrHod) {

        if (sessionRepo.existsBySectionIdAndSubjectIdAndSessionDateAndAcademicYearAndPeriodNumber(
                req.getSectionId(), req.getSubjectId(),
                req.getSessionDate(), req.getAcademicYear(), req.getPeriodNumber())) {
            throw new IllegalArgumentException(
                    "Is period ki " + req.getSessionDate()
                    + " ki attendance pehle se mark ho chuki hai. Edit karo agar change karna ho.");
        }

        Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));
        Subject subject = subjectRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));

        // ── Auto-resolve faculty ──────────────────────────────────────────────
        FacultyProfile faculty = null;
        if (req.getFacultyId() != null) {
            faculty = facultyRepo.findById(req.getFacultyId()).orElse(null);
        }
        if (faculty == null && userEmail != null) {
            faculty = facultyRepo.findByUserEmail(userEmail).orElse(null);
        }

        System.out.println("========== MARK ATTENDANCE ==========");
        System.out.println("Faculty Id    : " + faculty.getId());
        System.out.println("Subject Id    : " + req.getSubjectId());
        System.out.println("Section Id    : " + req.getSectionId());
        System.out.println("Academic Year : " + req.getAcademicYear());
        /*
        boolean isAssigned = assignmentRepo
                .existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                        faculty.getId(),
                        req.getSubjectId(),
                        req.getSectionId(),
                        req.getAcademicYear());

        System.out.println("isAssigned = " + isAssigned);

        // ── Faculty ownership check ───────────────────────────────────────────
        if (faculty != null && isFacultyOrHod) {
            boolean isAssigne = assignmentRepo
                    .existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                            faculty.getId(), req.getSubjectId(),
                            req.getSectionId(), req.getAcademicYear());
            if (!isAssigne) {
                throw new AccessDeniedException(
                        "Aap '" + subject.getName() + "' is section mein padhane ke liye assign nahi hain.");
            }
        }

         */

        boolean isAssigned = timetableRepo.existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                faculty.getId(), req.getSubjectId(), req.getSectionId(), req.getAcademicYear());

        if (faculty != null && isFacultyOrHod && !isAssigned) {
            throw new AccessDeniedException(
                    "Aap '" + subject.getName() + "' is section mein padhane ke liye assign nahi hain.");
        }

        AttendanceSession session = sessionRepo.save(AttendanceSession.builder()
                .section(section).subject(subject).faculty(faculty)
                .sessionDate(req.getSessionDate())
                .academicYear(req.getAcademicYear())
                .periodNumber(req.getPeriodNumber())
                .remarks(req.getRemarks())
                .build());

        for (MarkStudentRequest r : req.getRecords()) {
            StudentProfile student = studentRepo.findById(r.getStudentId())
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + r.getStudentId()));
            recordRepo.save(AttendanceRecord.builder()
                    .session(session).student(student)
                    .status(r.getStatus()).remarks(r.getRemarks()).build());

            // Only ABSENT is worth an immediate push — PRESENT/LATE marks
            // don't need to interrupt the student.
            if (r.getStatus() == AttendanceStatus.ABSENT) {
                notificationService.pushToUser(
                        student.getUser(),
                        "Marked Absent",
                        "You were marked absent in " + subject.getName()
                        + " on " + req.getSessionDate() + ".",
                        NotificationType.ATTENDANCE,
                        session.getId());
            }
        }

        return toFullResponse(sessionRepo.findById(session.getId()).orElseThrow());
    }

    // ── 4. Update existing session (edit karo) ───────────────────────────────
    @Transactional
    public AttendanceSessionResponse updateSession(
            UUID sessionId,
            CreateAttendanceSessionRequest req,
            String userEmail,
            boolean isFacultyOrHod) {

        AttendanceSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        // Faculty only apni session edit kar sakti hai
        if (isFacultyOrHod && session.getFaculty() != null && userEmail != null) {
            FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail).orElse(null);
            if (faculty != null && !faculty.getId().equals(session.getFaculty().getId())) {
                throw new AccessDeniedException("Aap sirf apni sessions edit kar sakte hain.");
            }
        }

        for (MarkStudentRequest r : req.getRecords()) {
            recordRepo.findBySessionIdAndStudentId(sessionId, r.getStudentId())
                    .ifPresent(record -> {
                        boolean becameAbsent = r.getStatus() == AttendanceStatus.ABSENT
                                && record.getStatus() != AttendanceStatus.ABSENT;

                        record.setStatus(r.getStatus());
                        record.setRemarks(r.getRemarks());
                        recordRepo.save(record);

                        if (becameAbsent) {
                            notificationService.pushToUser(
                                    record.getStudent().getUser(),
                                    "Marked Absent",
                                    "You were marked absent in " + session.getSubject().getName()
                                    + " on " + session.getSessionDate() + ".",
                                    NotificationType.ATTENDANCE,
                                    session.getId());
                        }
                    });
        }

        return toFullResponse(sessionRepo.findById(sessionId).orElseThrow());
    }

    // ── 5. List sessions ──────────────────────────────────────────────────────
    public Page<AttendanceSessionResponse> getSessions(
            UUID sectionId, UUID subjectId, UUID facultyId,
            LocalDate from, LocalDate to, String academicYear,
            int page, int size) {
        return sessionRepo.search(sectionId, subjectId, facultyId,
                academicYear, from, to, PageRequest.of(page, size))
                .map(this::toSummaryResponse);
    }

    public Page<AttendanceSessionResponse> getMySessions(String facultyEmail, int page, int size) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(facultyEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found"));
        return sessionRepo.search(null, null, faculty.getId(), null, null, null, PageRequest.of(page, size))
                .map(this::toSummaryResponse);
    }

    public AttendanceSessionResponse getSession(UUID id) {
        return toFullResponse(sessionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + id)));
    }

    // ── 6. Summary ────────────────────────────────────────────────────────────
    public List<AttendanceSummaryResponse> getSummary(UUID sectionId, String academicYear) {
        List<AttendanceSession> sessions = sessionRepo
                .findAllBySectionIdAndAcademicYearOrderBySessionDateDesc(sectionId, academicYear);
        if (sessions.isEmpty()) {
            return List.of();
        }

        List<StudentProfile> students
                = studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(sectionId);

        Set<Subject> subjects = sessions.stream()
                .map(AttendanceSession::getSubject)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<UUID, Long> sessionsPerSubject = sessions.stream()
                .collect(Collectors.groupingBy(s -> s.getSubject().getId(), Collectors.counting()));

        return students.stream().map(student -> {
            List<SubjectAttendanceSummary> subjectSummaries = subjects.stream().map(subject -> {
                long total = sessionsPerSubject.getOrDefault(subject.getId(), 0L);
                long attended = recordRepo.countAttended(
                        student.getId(), subject.getId(), sectionId,
                        academicYear, AttendanceStatus.ABSENT);
                long absent = total - attended;
                double pct = total > 0 ? Math.round((attended * 1000.0 / total)) / 10.0 : 0.0;
                return SubjectAttendanceSummary.builder()
                        .subjectId(subject.getId()).subjectCode(subject.getCode())
                        .subjectName(subject.getName())
                        .totalSessions((int) total).attendedSessions((int) attended)
                        .absentSessions((int) absent).percentage(pct)
                        .statusLabel(statusLabel(pct))
                        .eligibleForExam(pct >= 75.0) // ← Bug 8: 75% check
                        .build();
            }).toList();

            double overall = subjectSummaries.isEmpty() ? 0
                    : subjectSummaries.stream().mapToDouble(SubjectAttendanceSummary::getPercentage)
                            .average().orElse(0);

            return AttendanceSummaryResponse.builder()
                    .studentId(student.getId())
                    .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                    .enrollmentNumber(student.getEnrollmentNumber())
                    .overallPercentage(Math.round(overall * 10.0) / 10.0)
                    .overallStatus(statusLabel(overall))
                    .subjects(subjectSummaries).build();
        }).toList();
    }

    @Transactional
    public void deleteSession(UUID id) {
        sessionRepo.deleteById(id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String statusLabel(double pct) {
        return pct >= 75 ? "SAFE" : pct >= 60 ? "AT_RISK" : "DETAINED";
    }

    private TimetableEntryResponse toTimetableResponse(TimetableEntry t) {
        Section sec = t.getSection();
        Semester sem = sec.getSemester();
        Subject sub = t.getSubject();
        FacultyProfile fac = t.getFaculty();
        return TimetableEntryResponse.builder()
                .id(t.getId()).academicYear(t.getAcademicYear())
                .dayOfWeek(t.getDayOfWeek())
                .dayDisplayName(t.getDayOfWeek().getDisplayName())
                .periodNumber(t.getPeriodNumber())
                .startTime(t.getStartTime()).endTime(t.getEndTime())
                .roomNumber(t.getRoomNumber())
                .subjectId(sub.getId()).subjectCode(sub.getCode())
                .subjectName(sub.getName()).subjectType(sub.getType().name())
                .facultyId(fac != null ? fac.getId() : null)
                .facultyName(fac != null
                        ? fac.getUser().getFirstName() + " " + fac.getUser().getLastName() : null)
                .sectionId(sec.getId()).sectionName(sec.getName())
                .semesterId(sem.getId()).semesterName(sem.getName())
                .programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName())
                .build();
    }

    private AttendanceSessionResponse toSummaryResponse(AttendanceSession s) {
        return buildResponse(s, recordRepo.findAllBySessionId(s.getId()), false);
    }

    private AttendanceSessionResponse toFullResponse(AttendanceSession s) {
        return buildResponse(s, recordRepo.findAllBySessionId(s.getId()), true);
    }

    private AttendanceSessionResponse buildResponse(
            AttendanceSession s, List<AttendanceRecord> recs, boolean includeRecords) {

        long present = recs.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
        long late = recs.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
        long absent = recs.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();

        Section sec = s.getSection();
        Semester sem = sec.getSemester();
        Subject sub = s.getSubject();
        FacultyProfile fac = s.getFaculty();

        return AttendanceSessionResponse.builder()
                .id(s.getId()).academicYear(s.getAcademicYear())
                .sessionDate(s.getSessionDate()).periodNumber(s.getPeriodNumber()).remarks(s.getRemarks())
                .subjectId(sub.getId()).subjectCode(sub.getCode()).subjectName(sub.getName())
                .facultyId(fac != null ? fac.getId() : null)
                .facultyName(fac != null
                        ? fac.getUser().getFirstName() + " " + fac.getUser().getLastName() : "Admin")
                .sectionId(sec.getId()).sectionName(sec.getName())
                .semesterName(sem.getName()).programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName())
                .totalStudents(recs.size())
                .presentCount((int) present).lateCount((int) late).absentCount((int) absent)
                .records(includeRecords ? recs.stream().map(r -> AttendanceRecordResponse.builder()
                .recordId(r.getId()).studentId(r.getStudent().getId())
                .studentName(r.getStudent().getUser().getFirstName() + " "
                        + r.getStudent().getUser().getLastName())
                .enrollmentNumber(r.getStudent().getEnrollmentNumber())
                .status(r.getStatus()).remarks(r.getRemarks()).build()).toList()
                        : null)
                .createdAt(s.getCreatedAt()).build();
    }

    // ── Single student ki attendance (student self-service) ───────────────────
    public List<AttendanceSummaryResponse> getSummaryForStudent(
            UUID studentId, UUID sectionId, String academicYear) {

        List<AttendanceSession> sessions = sessionRepo
                .findAllBySectionIdAndAcademicYearOrderBySessionDateDesc(sectionId, academicYear);
        if (sessions.isEmpty()) {
            return List.of();
        }

        Set<Subject> subjects = sessions.stream()
                .map(AttendanceSession::getSubject)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<UUID, Long> sessionsPerSubject = sessions.stream()
                .collect(Collectors.groupingBy(s -> s.getSubject().getId(), Collectors.counting()));

        StudentProfile student = studentRepo.findById(studentId).orElseThrow();

        List<SubjectAttendanceSummary> subjectSummaries = subjects.stream().map(subject -> {
            long total = sessionsPerSubject.getOrDefault(subject.getId(), 0L);
            long attended = recordRepo.countAttended(
                    studentId, subject.getId(), sectionId,
                    academicYear, AttendanceStatus.ABSENT);
            double pct = total > 0 ? Math.round((attended * 1000.0 / total)) / 10.0 : 0.0;

            return SubjectAttendanceSummary.builder()
                    .subjectId(subject.getId())
                    .subjectCode(subject.getCode())
                    .subjectName(subject.getName())
                    .totalSessions((int) total)
                    .attendedSessions((int) attended)
                    .absentSessions((int) (total - attended))
                    .percentage(pct)
                    .statusLabel(statusLabel(pct))
                    .eligibleForExam(pct >= 75.0)
                    .build();
        }).toList();

        double overall = subjectSummaries.stream()
                .mapToDouble(SubjectAttendanceSummary::getPercentage).average().orElse(0);

        return List.of(AttendanceSummaryResponse.builder()
                .studentId(student.getId())
                .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                .enrollmentNumber(student.getEnrollmentNumber())
                .overallPercentage(Math.round(overall * 10.0) / 10.0)
                .overallStatus(statusLabel(overall))
                .subjects(subjectSummaries)
                .build());
    }
}
