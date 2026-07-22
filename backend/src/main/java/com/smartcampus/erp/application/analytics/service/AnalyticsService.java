package com.smartcampus.erp.application.analytics.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.analytics.dto.AdminAnalyticsResponse;
import com.smartcampus.erp.application.analytics.dto.FacultyAnalyticsResponse;
import com.smartcampus.erp.application.analytics.dto.StudentAnalyticsResponse;
import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;
import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.domain.shared.enums.FeeStatus;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceRecordRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceSessionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.DepartmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultySubjectAssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ProgramRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.TimetableRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.exam.repository.ExamScheduleRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.FeePaymentRepository;
import com.smartcampus.erp.infrastructure.persistence.fee.repository.StudentFeeRecordRepository;
import com.smartcampus.erp.infrastructure.persistence.notice.repository.NoticeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private final UserRepository userRepo;
    private final StudentProfileRepository studentRepo;
    private final FacultyProfileRepository facultyRepo;
    private final DepartmentRepository deptRepo;
    private final ProgramRepository programRepo;
    private final SectionRepository sectionRepo;
    private final SubjectRepository subjectRepo;
    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository recordRepo;
    private final ExamScheduleRepository examRepo;
    private final StudentFeeRecordRepository feeRecordRepo;
    private final FeePaymentRepository paymentRepo;
    private final NoticeRepository noticeRepo;
    private final TimetableRepository timetableRepo;
    private final FacultySubjectAssignmentRepository assignmentRepo;

    // ── ADMIN Analytics ───────────────────────────────────────────────────────
    public AdminAnalyticsResponse getAdminAnalytics(String academicYear) {

        long totalStudents = studentRepo.count();
        long totalFaculty = facultyRepo.count();
        long totalDepts = deptRepo.count();
        long totalPrograms = programRepo.count();
        long totalSubjects = subjectRepo.count();
        long totalSections = sectionRepo.count();
        long activeStudents = userRepo.countByRoleAndEnabled(Role.STUDENT, true);
        long activeFaculty = userRepo.countByRoleAndEnabled(Role.FACULTY, true);

        // ── Today's Attendance ────────────────────────────────────────────────
        LocalDate today = LocalDate.now();
        var todaySessions = sessionRepo.findAll().stream()
                .filter(s -> s.getSessionDate().equals(today))
                .toList();

        long todayTotal = todaySessions.stream()
                .mapToLong(s -> recordRepo.findAllBySessionId(s.getId()).size()).sum();
        long todayPresent = todaySessions.stream()
                .mapToLong(s -> recordRepo.findAllBySessionId(s.getId()).stream()
                .filter(r -> r.getStatus() == AttendanceStatus.PRESENT
                || r.getStatus() == AttendanceStatus.LATE).count())
                .sum();
        double todayPct = todayTotal > 0 ? Math.round((todayPresent * 1000.0 / todayTotal)) / 10.0 : 0;

        // ── Attendance Trend (last 7 days) ────────────────────────────────────
        List<AdminAnalyticsResponse.TrendPoint> attTrend = new ArrayList<>();
        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd MMM");
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            var daySessions = sessionRepo.findAll().stream()
                    .filter(s -> s.getSessionDate().equals(day)).toList();
            long t = daySessions.stream().mapToLong(s -> recordRepo.findAllBySessionId(s.getId()).size()).sum();
            long p = daySessions.stream().mapToLong(s -> recordRepo.findAllBySessionId(s.getId()).stream()
                    .filter(r -> r.getStatus() == AttendanceStatus.PRESENT
                    || r.getStatus() == AttendanceStatus.LATE).count()).sum();
            double pct = t > 0 ? Math.round((p * 1000.0 / t)) / 10.0 : 0;
            attTrend.add(AdminAnalyticsResponse.TrendPoint.builder()
                    .label(day.format(df)).value(pct).build());
        }

        // ── Fee Stats ─────────────────────────────────────────────────────────
        Double collected = feeRecordRepo.sumPaidByStructure(null);
        Double pending = feeRecordRepo.sumDueAll();
        long paidCount = feeRecordRepo.countByStatus(FeeStatus.PAID);
        long pendingCnt = feeRecordRepo.countByStatus(FeeStatus.PENDING)
                + feeRecordRepo.countByStatus(FeeStatus.PARTIAL)
                + feeRecordRepo.countByStatus(FeeStatus.OVERDUE);

        // ── Fee Collection Trend (last 6 months) ──────────────────────────────
        List<AdminAnalyticsResponse.TrendPoint> feeTrend = new ArrayList<>();
        DateTimeFormatter mf = DateTimeFormatter.ofPattern("MMM yy");
        for (int i = 5; i >= 0; i--) {
            LocalDate month = today.minusMonths(i).withDayOfMonth(1);
            LocalDate end = month.plusMonths(1).minusDays(1);
            double amt = paymentRepo.sumByDateRange(month, end);
            feeTrend.add(AdminAnalyticsResponse.TrendPoint.builder()
                    .label(month.format(mf)).value(Math.round(amt * 100.0) / 100.0).build());
        }

        // ── Fee Status Breakdown ──────────────────────────────────────────────
        List<AdminAnalyticsResponse.PieSlice> feeBreakdown = List.of(
                AdminAnalyticsResponse.PieSlice.builder().name("Paid")
                        .value(feeRecordRepo.countByStatus(FeeStatus.PAID)).color("#22c55e").build(),
                AdminAnalyticsResponse.PieSlice.builder().name("Partial")
                        .value(feeRecordRepo.countByStatus(FeeStatus.PARTIAL)).color("#3b82f6").build(),
                AdminAnalyticsResponse.PieSlice.builder().name("Pending")
                        .value(feeRecordRepo.countByStatus(FeeStatus.PENDING)).color("#f59e0b").build(),
                AdminAnalyticsResponse.PieSlice.builder().name("Overdue")
                        .value(feeRecordRepo.countByStatus(FeeStatus.OVERDUE)).color("#ef4444").build()
        );

        // ── Students by Department ─────────────────────────────────────────────
        List<AdminAnalyticsResponse.PieSlice> byDept = deptRepo.findAllByOrderByNameAsc()
                .stream()
                .map(d -> {
                    long cnt = studentRepo.countByDepartmentId(d.getId());
                    return AdminAnalyticsResponse.PieSlice.builder()
                            .name(d.getCode()).value(cnt)
                            .color(randomColor(d.getId().toString())).build();
                })
                .filter(s -> s.getValue() > 0)
                .toList();

        // ── Recent Notices ────────────────────────────────────────────────────
        DateTimeFormatter nf = DateTimeFormatter.ofPattern("dd MMM, hh:mm a");
        var recent = noticeRepo.findAll(
                PageRequest.of(0, 5, Sort.by("createdAt").descending())).getContent();
        List<AdminAnalyticsResponse.RecentNotice> notices = recent.stream().map(n
                -> AdminAnalyticsResponse.RecentNotice.builder()
                        .title(n.getTitle())
                        .category(n.getCategory().getDisplayName())
                        .postedBy(n.getPostedBy().getFirstName() + " " + n.getPostedBy().getLastName())
                        .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().format(nf) : "")
                        .build()).toList();

        return AdminAnalyticsResponse.builder()
                .totalStudents(totalStudents).totalFaculty(totalFaculty)
                .totalDepartments(totalDepts).totalPrograms(totalPrograms)
                .totalSubjects(totalSubjects).totalSections(totalSections)
                .activeStudents(activeStudents).activeFaculty(activeFaculty)
                .todayAttendancePercent(todayPct).todaySessionsMarked(todaySessions.size())
                .attendanceTrend(attTrend)
                .totalFeesCollected(collected != null ? collected : 0)
                .totalFeesPending(pending != null ? pending : 0)
                .paidStudents(paidCount).pendingStudents(pendingCnt)
                .feeCollectionTrend(feeTrend).feeStatusBreakdown(feeBreakdown)
                .studentsByDepartment(byDept)
                .attendanceByDepartment(List.of())
                .recentNotices(notices)
                .build();
    }

    // ── STUDENT Analytics ─────────────────────────────────────────────────────
    public StudentAnalyticsResponse getStudentAnalytics(String email, String academicYear) {
        var student = studentRepo.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        var section = student.getCurrentSection();
        var semester = section != null ? section.getSemester() : null;
        var program = semester != null ? semester.getProgram() : null;
        var dept = program != null ? program.getDepartment() : null;

        // ── Attendance ────────────────────────────────────────────────────────
        List<StudentAnalyticsResponse.SubjectAttendance> subjectAtt = List.of();
        double overallPct = 0;
        String attStatus = "SAFE";

        if (section != null) {
            var sessions = sessionRepo
                    .findAllBySectionIdAndAcademicYearOrderBySessionDateDesc(
                            section.getId(), academicYear);

            Set<com.smartcampus.erp.domain.academic.Subject> subjects = sessions.stream()
                    .map(s -> s.getSubject())
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            Map<UUID, Long> sessPerSubject = sessions.stream()
                    .collect(Collectors.groupingBy(s -> s.getSubject().getId(), Collectors.counting()));

            subjectAtt = subjects.stream().map(sub -> {
                long total = sessPerSubject.getOrDefault(sub.getId(), 0L);
                long attended = recordRepo.countAttended(
                        student.getId(), sub.getId(), section.getId(),
                        academicYear, AttendanceStatus.ABSENT);
                double pct = total > 0 ? Math.round((attended * 1000.0 / total)) / 10.0 : 0;
                String lbl = pct >= 75 ? "SAFE" : pct >= 60 ? "AT_RISK" : "DETAINED";
                return StudentAnalyticsResponse.SubjectAttendance.builder()
                        .subjectCode(sub.getCode()).subjectName(sub.getName())
                        .percentage(pct).attended((int) attended).total((int) total)
                        .statusLabel(lbl).eligibleForExam(pct >= 75).build();
            }).toList();

            if (!subjectAtt.isEmpty()) {
                overallPct = Math.round(
                        subjectAtt.stream().mapToDouble(s -> s.getPercentage()).average().orElse(0) * 10.0) / 10.0;
                attStatus = overallPct >= 75 ? "SAFE" : overallPct >= 60 ? "AT_RISK" : "DETAINED";
            }
        }

        // ── Upcoming Exams ────────────────────────────────────────────────────
        List<StudentAnalyticsResponse.UpcomingExam> upcomingExams = List.of();
        if (section != null) {
            upcomingExams = examRepo.findAll().stream()
                    .filter(e -> e.getSection().getId().equals(section.getId())
                    && e.getAcademicYear().equals(academicYear)
                    && (e.getStatus() == ExamStatus.SCHEDULED || e.getStatus() == ExamStatus.ONGOING)
                    && !e.getExamDate().isBefore(LocalDate.now()))
                    .sorted(Comparator.comparing(e -> e.getExamDate()))
                    .limit(5)
                    .map(e -> StudentAnalyticsResponse.UpcomingExam.builder()
                    .subjectName(e.getSubject().getName())
                    .subjectCode(e.getSubject().getCode())
                    .examTypeDisplay(e.getExamType().getDisplayName())
                    .examDate(e.getExamDate())
                    .startTime(e.getStartTime() != null ? e.getStartTime().toString() : null)
                    .venue(e.getVenue())
                    .statusDisplay(e.getStatus().getDisplayName())
                    .build())
                    .toList();
        }

        // ── Fee Summary ───────────────────────────────────────────────────────
        var feeRecords = feeRecordRepo.findAllByStudentId(student.getId());
        double totalPaid = feeRecords.stream().mapToDouble(r -> r.getPaidAmount()).sum();
        double totalDue = feeRecords.stream().mapToDouble(r -> r.getDueAmount()).sum();
        long pendFee = feeRecords.stream()
                .filter(r -> r.getStatus() != FeeStatus.PAID && r.getStatus() != FeeStatus.WAIVED)
                .count();

        // ── Recent Notices ────────────────────────────────────────────────────
        DateTimeFormatter nf = DateTimeFormatter.ofPattern("dd MMM");
        var recentNotices = noticeRepo.findAll(
                PageRequest.of(0, 3, Sort.by("createdAt").descending())).getContent()
                .stream().map(n -> AdminAnalyticsResponse.RecentNotice.builder()
                .title(n.getTitle())
                .category(n.getCategory().getDisplayName())
                .postedBy(n.getPostedBy().getFirstName())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().format(nf) : "")
                .build()).toList();

        return StudentAnalyticsResponse.builder()
                .enrollmentNumber(student.getEnrollmentNumber())
                .batch(student.getBatch())
                .programName(program != null ? program.getName() : "")
                .departmentName(dept != null ? dept.getName() : "")
                .semesterName(semester != null ? semester.getName() : "")
                .sectionName(section != null ? section.getName() : "")
                .overallAttendancePercent(overallPct).attendanceStatus(attStatus)
                .subjectAttendance(subjectAtt)
                .totalFeesDue(totalDue).totalFeesPaid(totalPaid)
                .pendingFeeRecords((int) pendFee)
                .upcomingExams(upcomingExams)
                .recentNotices(recentNotices)
                .build();
    }

    // ── FACULTY Analytics ─────────────────────────────────────────────────────
    public FacultyAnalyticsResponse getFacultyAnalytics(String email, String academicYear) {
        var faculty = facultyRepo.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found"));

        var dept = faculty.getDepartment();

        // ── Today's classes ───────────────────────────────────────────────────
        final com.smartcampus.erp.domain.shared.enums.WeekDay today;

        try {
            today = com.smartcampus.erp.domain.shared.enums.WeekDay
                    .valueOf(LocalDate.now().getDayOfWeek().name());
        } catch (IllegalArgumentException e) {
            return FacultyAnalyticsResponse.builder().build();
        }
        List<FacultyAnalyticsResponse.TodayClass> todayClasses = List.of();
        if (today != null) {
            var todayEntries = timetableRepo
                    .findAllByFacultyIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
                            faculty.getId(), academicYear)
                    .stream()
                    .filter(t -> t.getDayOfWeek() == today)
                    .toList();

            todayClasses = todayEntries.stream().map(t -> {
                // Check if attendance already marked for today
                boolean marked = sessionRepo
                        .existsBySectionIdAndSubjectIdAndSessionDateAndAcademicYearAndPeriodNumber(
                                t.getSection().getId(), t.getSubject().getId(),
                                LocalDate.now(), academicYear, t.getPeriodNumber());
                return FacultyAnalyticsResponse.TodayClass.builder()
                        .subjectName(t.getSubject().getName())
                        .subjectCode(t.getSubject().getCode())
                        .sectionName(t.getSection().getName())
                        .semesterName(t.getSection().getSemester().getName())
                        .periodNumber(t.getPeriodNumber())
                        .startTime(t.getStartTime() != null ? t.getStartTime().toString() : "")
                        .endTime(t.getEndTime() != null ? t.getEndTime().toString() : "")
                        .roomNumber(t.getRoomNumber())
                        .attendanceMarked(marked)
                        .build();
            }).toList();
        }

        // ── Subject assignments ───────────────────────────────────────────────
        var assignments = assignmentRepo.search(academicYear, null, null, faculty.getId(),
                PageRequest.of(0, 100));
        int totalSubjects = (int) assignments.getTotalElements();
        int totalStudents = assignments.getContent().stream()
                .mapToInt(a -> (int) studentRepo.countByCurrentSectionId(a.getSection().getId()))
                .sum();
        int totalPeriods = timetableRepo
                .findAllByFacultyIdAndAcademicYearOrderByDayOfWeekAscPeriodNumberAsc(
                        faculty.getId(), academicYear).size();

        // ── Recent sessions ───────────────────────────────────────────────────
        var recentSess = sessionRepo.search(null, null, faculty.getId(),
                academicYear, null, null, PageRequest.of(0, 5)).getContent();

        List<FacultyAnalyticsResponse.RecentSession> recentSessions = recentSess.stream()
                .map(s -> {
                    var recs = recordRepo.findAllBySessionId(s.getId());
                    long present = recs.stream()
                            .filter(r -> r.getStatus() == AttendanceStatus.PRESENT
                            || r.getStatus() == AttendanceStatus.LATE).count();
                    double pct = recs.size() > 0
                            ? Math.round((present * 1000.0 / recs.size())) / 10.0 : 0;
                    return FacultyAnalyticsResponse.RecentSession.builder()
                            .sessionDate(s.getSessionDate())
                            .subjectName(s.getSubject().getName())
                            .sectionName(s.getSection().getName())
                            .presentCount((int) present)
                            .absentCount((int) (recs.size() - present))
                            .percentage(pct).build();
                }).toList();

        // ── Subject attendance stats ──────────────────────────────────────────
        List<FacultyAnalyticsResponse.SubjectAttendanceStat> subjectStats = assignments.getContent()
                .stream()
                .map(a -> {
                    var subSessions = sessionRepo.search(
                            a.getSection().getId(), a.getSubject().getId(),
                            faculty.getId(), academicYear, null, null,
                            PageRequest.of(0, 1000)).getContent();
                    double avg = subSessions.stream().mapToDouble(s -> {
                        var recs = recordRepo.findAllBySessionId(s.getId());
                        if (recs.isEmpty()) {
                            return 0;
                        }
                        long p = recs.stream().filter(r
                                -> r.getStatus() == AttendanceStatus.PRESENT
                                || r.getStatus() == AttendanceStatus.LATE).count();
                        return (p * 100.0 / recs.size());
                    }).average().orElse(0);

                    return FacultyAnalyticsResponse.SubjectAttendanceStat.builder()
                            .subjectName(a.getSubject().getName())
                            .subjectCode(a.getSubject().getCode())
                            .sectionName(a.getSection().getName())
                            .totalSessions(subSessions.size())
                            .avgAttendancePercent(Math.round(avg * 10.0) / 10.0)
                            .build();
                }).toList();

        return FacultyAnalyticsResponse.builder()
                .employeeId(faculty.getEmployeeId())
                .departmentName(dept != null ? dept.getName() : "")
                .designation(faculty.getDesignation().name())
                .totalSubjectsAssigned(totalSubjects)
                .totalPeriodsPerWeek(totalPeriods)
                .totalStudentsUnder(totalStudents)
                .todayClasses(todayClasses)
                .todaySessionsMarked((int) todayClasses.stream()
                        .filter(FacultyAnalyticsResponse.TodayClass::isAttendanceMarked).count())
                .recentSessions(recentSessions)
                .subjectAttendanceStats(subjectStats)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String randomColor(String seed) {
        String[] colors = {"#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981",
            "#f59e0b", "#ef4444", "#ec4899", "#84cc16", "#f97316"};
        return colors[Math.abs(seed.hashCode()) % colors.length];
    }
}
