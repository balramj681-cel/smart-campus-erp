package com.smartcampus.erp.application.attendance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.attendance.dto.QrProgressResponse;
import com.smartcampus.erp.application.attendance.dto.QrScanResponse;
import com.smartcampus.erp.application.attendance.dto.QrSessionResponse;
import com.smartcampus.erp.application.attendance.dto.StartQrSessionRequest;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.AttendanceRecord;
import com.smartcampus.erp.domain.academic.AttendanceSession;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.shared.enums.AttendanceStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceRecordRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.AttendanceSessionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.TimetableRepository;

import lombok.RequiredArgsConstructor;

/**
 * QR-code self-check-in flow, layered on top of the existing
 * {@link AttendanceSession}/{@link AttendanceRecord} tables — no schema fork,
 * no separate history. Faculty starts a session with a short-lived
 * {@code qrToken}; students scan it and each scan creates exactly one
 * {@link AttendanceRecord}(PRESENT) for themselves. Finalizing clears the token
 * and back-fills ABSENT for everyone in the section who never scanned, so
 * downstream attendance-percentage math (in {@link AttendanceService}) works
 * completely unchanged.
 */
@Service
@RequiredArgsConstructor
public class QrAttendanceService {

    private static final int DEFAULT_VALIDITY_MINUTES = 10;

    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository recordRepo;
    private final StudentProfileRepository studentRepo;
    private final SectionRepository sectionRepo;
    private final SubjectRepository subjectRepo;
    private final FacultyProfileRepository facultyRepo;
    //private final FacultySubjectAssignmentRepository assignmentRepo;
    private final TimetableRepository timetableRepo;
    private final NotificationService notificationService;

    // ── Faculty: start a QR session ─────────────────────────────────────────
    @Transactional
    public QrSessionResponse startSession(StartQrSessionRequest req, String facultyEmail) {
        if (sessionRepo.existsBySectionIdAndSubjectIdAndSessionDateAndAcademicYearAndPeriodNumber(
                req.getSectionId(), req.getSubjectId(), req.getSessionDate(), req.getAcademicYear(), req.getPeriodNumber())) {
            throw new IllegalArgumentException(
                    "Is section + subject ki " + req.getSessionDate() + " ki attendance pehle se maujood hai.");
        }

        FacultyProfile faculty = facultyRepo.findByUserEmail(facultyEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found"));
        Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));
        Subject subject = subjectRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        /*
        boolean isAssigned = assignmentRepo.existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                faculty.getId(), req.getSubjectId(), req.getSectionId(), req.getAcademicYear());
        if (!isAssigned) {
            throw new AccessDeniedException(
                    "Aap '" + subject.getName() + "' is section mein padhane ke liye assign nahi hain.");
        }

         */

        boolean teachesThisClass = timetableRepo.existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                faculty.getId(), req.getSubjectId(), req.getSectionId(), req.getAcademicYear());
        if (!teachesThisClass) {
            throw new AccessDeniedException(
                    "Aap '" + subject.getName() + "' is section mein padhane ke liye assign nahi hain.");
        }

        int minutes = req.getValidityMinutes() != null ? req.getValidityMinutes() : DEFAULT_VALIDITY_MINUTES;

        AttendanceSession session = sessionRepo.save(AttendanceSession.builder()
                .section(section).subject(subject).faculty(faculty)
                .sessionDate(req.getSessionDate())
                .academicYear(req.getAcademicYear())
                .periodNumber(req.getPeriodNumber())
                .remarks(req.getRemarks())
                .qrToken(UUID.randomUUID().toString().replace("-", ""))
                .qrExpiresAt(LocalDateTime.now().plusMinutes(minutes))
                .build());

        return toQrResponse(session);
    }

    // ── Faculty: live progress (poll every few seconds) ──────────────────────
    public QrProgressResponse getProgress(UUID sessionId, String facultyEmail) {
        AttendanceSession session = findSessionOrThrow(sessionId);
        assertOwnership(session, facultyEmail);

        List<AttendanceRecord> scanned = recordRepo.findAllBySessionId(sessionId);
        int total = studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(
                session.getSection().getId()).size();

        boolean active = session.getQrToken() != null
                && session.getQrExpiresAt() != null
                && session.getQrExpiresAt().isAfter(LocalDateTime.now());

        return QrProgressResponse.builder()
                .sessionId(sessionId)
                .active(active)
                .totalStudents(total)
                .scannedCount(scanned.size())
                .scannedStudentNames(scanned.stream()
                        .map(r -> r.getStudent().getUser().getFirstName() + " " + r.getStudent().getUser().getLastName())
                        .collect(Collectors.toList()))
                .build();
    }

    // ── Student: scan ────────────────────────────────────────────────────
    @Transactional
    public QrScanResponse scan(String qrToken, String studentEmail) {
        AttendanceSession session = sessionRepo.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid ya expired QR code."));

        if (session.getQrExpiresAt() == null || session.getQrExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Ye QR code expire ho chuka hai. Faculty se dobara generate karwao.");
        }

        StudentProfile student = studentRepo.findByUserEmail(studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null
                || !student.getCurrentSection().getId().equals(session.getSection().getId())) {
            throw new IllegalArgumentException("Aap is section ke student nahi hain.");
        }

        boolean already = recordRepo.findBySessionIdAndStudentId(session.getId(), student.getId()).isPresent();
        if (already) {
            return QrScanResponse.builder()
                    .success(true).alreadyMarked(true)
                    .message("Aapki attendance pehle se mark ho chuki hai.")
                    .subjectName(session.getSubject().getName())
                    .build();
        }

        recordRepo.save(AttendanceRecord.builder()
                .session(session).student(student)
                .status(AttendanceStatus.PRESENT)
                .build());

        return QrScanResponse.builder()
                .success(true).alreadyMarked(false)
                .message("Attendance mark ho gayi!")
                .subjectName(session.getSubject().getName())
                .build();
    }

    // ── Faculty: finalize — scan na karne walon ko ABSENT mark karo ─────────
    @Transactional
    public QrProgressResponse finalizeSession(UUID sessionId, String facultyEmail) {
        AttendanceSession session = findSessionOrThrow(sessionId);
        assertOwnership(session, facultyEmail);

        List<StudentProfile> allStudents
                = studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(session.getSection().getId());
        Set<UUID> scannedIds = recordRepo.findAllBySessionId(sessionId).stream()
                .map(r -> r.getStudent().getId())
                .collect(Collectors.toSet());

        for (StudentProfile student : allStudents) {
            if (!scannedIds.contains(student.getId())) {
                recordRepo.save(AttendanceRecord.builder()
                        .session(session).student(student)
                        .status(AttendanceStatus.ABSENT)
                        .remarks("Did not scan QR")
                        .build());
                notificationService.pushToUser(
                        student.getUser(),
                        "Marked Absent",
                        "You were marked absent in " + session.getSubject().getName()
                        + " on " + session.getSessionDate() + " (QR not scanned).",
                        NotificationType.ATTENDANCE,
                        session.getId());
            }
        }

        session.setQrToken(null);
        session.setQrExpiresAt(null);
        sessionRepo.save(session);

        return getProgress(sessionId, facultyEmail);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private AttendanceSession findSessionOrThrow(UUID id) {
        return sessionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + id));
    }

    private void assertOwnership(AttendanceSession session, String facultyEmail) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(facultyEmail).orElse(null);
        if (faculty == null || session.getFaculty() == null
                || !faculty.getId().equals(session.getFaculty().getId())) {
            throw new AccessDeniedException("Aap sirf apni session manage kar sakte hain.");
        }
    }

    private QrSessionResponse toQrResponse(AttendanceSession s) {
        return QrSessionResponse.builder()
                .sessionId(s.getId())
                .qrToken(s.getQrToken())
                .qrExpiresAt(s.getQrExpiresAt())
                .subjectName(s.getSubject().getName())
                .sectionName(s.getSection().getName())
                .build();
    }
}
