package com.smartcampus.erp.application.exam.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.exam.dto.CreateExamScheduleRequest;
import com.smartcampus.erp.application.exam.dto.ExamScheduleResponse;
import com.smartcampus.erp.application.exam.dto.HallTicketExamEntry;
import com.smartcampus.erp.application.exam.dto.HallTicketResponse;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.exam.ExamSchedule;
import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.domain.shared.enums.ExamType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.exam.repository.ExamScheduleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamScheduleRepository  examRepo;
    private final SectionRepository       sectionRepo;
    private final SubjectRepository       subjectRepo;
    private final StudentProfileRepository studentRepo;

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public ExamScheduleResponse create(CreateExamScheduleRequest req) {
        Section section = findSection(req.getSectionId());
        Subject subject = findSubject(req.getSubjectId());

        // Time conflict check
        UUID nil = new UUID(0, 0);
        if (examRepo.hasConflict(req.getSectionId(), req.getExamDate(),
                req.getStartTime(), req.getEndTime(), req.getAcademicYear(), nil)) {
            throw new IllegalArgumentException(
                "Is section mein " + req.getExamDate() + " ko " +
                req.getStartTime() + " - " + req.getEndTime() + " slot already booked hai.");
        }

        return toResponse(examRepo.save(ExamSchedule.builder()
                .section(section).subject(subject)
                .examType(req.getExamType())
                .examDate(req.getExamDate())
                .startTime(req.getStartTime()).endTime(req.getEndTime())
                .venue(req.getVenue()).academicYear(req.getAcademicYear())
                .instructions(req.getInstructions())
                .build()));
    }

    // ── List (paginated + filtered) ───────────────────────────────────────

    public Page<ExamScheduleResponse> getAll(
            UUID sectionId, ExamStatus status, ExamType examType,
            String academicYear, LocalDate from, LocalDate to, int page, int size) {
        return examRepo.search(sectionId, status, examType, academicYear, from, to,
                        PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Section ka full schedule ──────────────────────────────────────────

    public List<ExamScheduleResponse> getForSection(UUID sectionId, String academicYear) {
        return examRepo
                .findAllBySectionIdAndAcademicYearOrderByExamDateAscStartTimeAsc(
                        sectionId, academicYear)
                .stream().map(this::toResponse).toList();
    }

    // ── Date-wise (timetable integration) ────────────────────────────────

    public List<ExamScheduleResponse> getForDate(UUID sectionId, LocalDate date, String academicYear) {
        return examRepo
                .findAllBySectionIdAndExamDateAndAcademicYear(sectionId, date, academicYear)
                .stream().map(this::toResponse).toList();
    }

    // ── Update ────────────────────────────────────────────────────────────

    @Transactional
    public ExamScheduleResponse update(UUID id, CreateExamScheduleRequest req) {
        ExamSchedule exam = findOrThrow(id);

        if (examRepo.hasConflict(exam.getSection().getId(), req.getExamDate(),
                req.getStartTime(), req.getEndTime(), req.getAcademicYear(), id)) {
            throw new IllegalArgumentException("Time slot conflict hai.");
        }

        if (req.getExamType()    != null) exam.setExamType(req.getExamType());
        if (req.getExamDate()    != null) exam.setExamDate(req.getExamDate());
        if (req.getStartTime()   != null) exam.setStartTime(req.getStartTime());
        if (req.getEndTime()     != null) exam.setEndTime(req.getEndTime());
        if (req.getVenue()       != null) exam.setVenue(req.getVenue());
        if (req.getInstructions()!= null) exam.setInstructions(req.getInstructions());

        return toResponse(examRepo.save(exam));
    }

    // ── Update Status ─────────────────────────────────────────────────────

    @Transactional
    public ExamScheduleResponse updateStatus(UUID id, ExamStatus newStatus) {
        ExamSchedule exam = findOrThrow(id);
        exam.setStatus(newStatus);
        return toResponse(examRepo.save(exam));
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) { examRepo.deleteById(id); }

    // ── Hall Tickets ──────────────────────────────────────────────────────

    public List<HallTicketResponse> getHallTickets(
            UUID sectionId, String academicYear, ExamType examType) {

        // Exams for this section (optionally filtered by type)
        List<ExamSchedule> exams = examType != null
                ? examRepo.findAllBySectionIdAndAcademicYearAndExamTypeOrderByExamDateAscStartTimeAsc(
                        sectionId, academicYear, examType)
                : examRepo.findAllBySectionIdAndAcademicYearOrderByExamDateAscStartTimeAsc(
                        sectionId, academicYear);

        String examTypeLabel = examType != null
                ? examType.getDisplayName() + " Examinations"
                : "Examinations " + academicYear;

        List<StudentProfile> students =
                studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(sectionId);

        return students.stream().map(student -> {
            Section sec = student.getCurrentSection();
            var sem = sec != null ? sec.getSemester() : null;

            List<HallTicketExamEntry> entries = exams.stream().map(e ->
                    HallTicketExamEntry.builder()
                            .examScheduleId(e.getId())
                            .subjectCode(e.getSubject().getCode())
                            .subjectName(e.getSubject().getName())
                            .creditHours(e.getSubject().getCreditHours())
                            .examType(e.getExamType())
                            .examTypeDisplay(e.getExamType().getDisplayName())
                            .examDate(e.getExamDate())
                            .startTime(e.getStartTime())
                            .endTime(e.getEndTime())
                            .venue(e.getVenue())
                            .statusDisplay(e.getStatus().getDisplayName())
                            .build()
            ).toList();

            return HallTicketResponse.builder()
                    .studentId(student.getId())
                    .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                    .enrollmentNumber(student.getEnrollmentNumber())
                    .batch(student.getBatch())
                    .programName(sem != null ? sem.getProgram().getName() : "")
                    .departmentName(sem != null ? sem.getProgram().getDepartment().getName() : "")
                    .semesterName(sem != null ? sem.getName() : "")
                    .sectionName(sec != null ? sec.getName() : "")
                    .academicYear(academicYear)
                    .examTypeLabel(examTypeLabel)
                    .hallTicketNumber("HT/" + academicYear + "/" + student.getEnrollmentNumber())
                    .exams(entries)
                    .build();
        }).toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private ExamSchedule findOrThrow(UUID id) {
        return examRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + id));
    }
    private Section findSection(UUID id) {
        return sectionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Section not found: " + id));
    }
    private Subject findSubject(UUID id) {
        return subjectRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + id));
    }

    private ExamScheduleResponse toResponse(ExamSchedule e) {
        Section sec = e.getSection();
        var sem = sec.getSemester();
        return ExamScheduleResponse.builder()
                .id(e.getId())
                .examType(e.getExamType()).examTypeDisplay(e.getExamType().getDisplayName())
                .examDate(e.getExamDate()).startTime(e.getStartTime()).endTime(e.getEndTime())
                .venue(e.getVenue()).academicYear(e.getAcademicYear())
                .status(e.getStatus()).statusDisplay(e.getStatus().getDisplayName())
                .instructions(e.getInstructions())
                .subjectId(e.getSubject().getId())
                .subjectCode(e.getSubject().getCode()).subjectName(e.getSubject().getName())
                .creditHours(e.getSubject().getCreditHours())
                .sectionId(sec.getId()).sectionName(sec.getName())
                .semesterName(sem.getName()).programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName())
                .createdAt(e.getCreatedAt())
                .build();
    }
}