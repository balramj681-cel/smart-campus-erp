package com.smartcampus.erp.application.marks.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.exam.dto.ExamScheduleResponse;
import com.smartcampus.erp.domain.exam.ExamSchedule;
import com.smartcampus.erp.domain.shared.enums.ExamStatus;
import com.smartcampus.erp.infrastructure.persistence.exam.repository.ExamScheduleRepository;
import com.smartcampus.erp.application.exam.service.DebarmentService;

import com.smartcampus.erp.application.marks.dto.ComponentMarkDto;
import com.smartcampus.erp.application.marks.dto.CreateExamComponentRequest;
import com.smartcampus.erp.application.marks.dto.EnterMarksRequest;
import com.smartcampus.erp.application.marks.dto.ExamComponentResponse;
import com.smartcampus.erp.application.marks.dto.StudentMarkEntry;
import com.smartcampus.erp.application.marks.dto.StudentMarkResponse;
import com.smartcampus.erp.application.marks.dto.StudentResultResponse;
import com.smartcampus.erp.application.marks.dto.SubjectResultDto;
import com.smartcampus.erp.domain.academic.ExamComponent;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.StudentMark;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.shared.enums.GradeLevel;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ExamComponentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentMarkRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MarksService {

    private final ExamComponentRepository componentRepo;
    private final StudentMarkRepository markRepo;
    private final SectionRepository sectionRepo;
    private final SubjectRepository subjectRepo;
    private final FacultyProfileRepository facultyRepo;
    private final StudentProfileRepository studentRepo;
    private final ExamScheduleRepository examScheduleRepo;
    private final DebarmentService debarmentService;

    // ── Create Exam Component ─────────────────────────────────────────────
    @Transactional
    public ExamComponentResponse createComponent(CreateExamComponentRequest req) {
        if (componentRepo.existsBySectionIdAndSubjectIdAndExamTypeAndAcademicYear(
                req.getSectionId(), req.getSubjectId(),
                req.getExamType(), req.getAcademicYear())) {
            throw new IllegalArgumentException(
                    req.getExamType().getDisplayName() + " already exists for this subject in this section.");
        }

        Section section = findSection(req.getSectionId());
        Subject subject = findSubject(req.getSubjectId());
        FacultyProfile faculty = req.getFacultyId() != null
                ? facultyRepo.findById(req.getFacultyId()).orElse(null) : null;

        ExamComponent ec = componentRepo.save(ExamComponent.builder()
                .section(section).subject(subject).faculty(faculty)
                .examType(req.getExamType())
                .maxMarks(req.getMaxMarks() > 0
                        ? req.getMaxMarks()
                        : req.getExamType().getDefaultMaxMarks())
                .weightage(req.getWeightage())
                .academicYear(req.getAcademicYear())
                .scheduledDate(req.getScheduledDate())
                .build());

        // Pre-create empty mark rows for all students in section
        studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(section.getId())
                .forEach(student -> markRepo.save(
                StudentMark.builder().examComponent(ec).student(student).build()));

        return toComponentResponse(ec);
    }

    // ── List Components for a Section ─────────────────────────────────────
    public List<ExamComponentResponse> getComponents(UUID sectionId, String academicYear) {
        return componentRepo
                .findAllBySectionIdAndAcademicYearOrderBySubjectNameAscExamTypeAsc(
                        sectionId, academicYear)
                .stream().map(this::toComponentResponse).toList();
    }

    // ── List Components for a Subject in a Section ────────────────────────
    public List<ExamComponentResponse> getComponentsForSubject(
            UUID sectionId, UUID subjectId, String academicYear) {
        return componentRepo
                .findForSubjectInSection(sectionId, subjectId, academicYear)
                .stream().map(this::toComponentResponse).toList();
    }

    // ── Get Marks for a Component ─────────────────────────────────────────
    public List<StudentMarkResponse> getMarksForComponent(UUID componentId) {
        ExamComponent ec = findComponent(componentId);
        return markRepo.findAllWithStudentByComponentId(componentId)
                .stream().map(m -> toMarkResponse(m, ec.getMaxMarks())).toList();
    }

    // ── Enter / Update Marks ──────────────────────────────────────────────
    @Transactional
    public List<StudentMarkResponse> enterMarks(EnterMarksRequest req) {
        ExamComponent ec = findComponent(req.getComponentId());

        for (StudentMarkEntry entry : req.getEntries()) {

            // Bug 8: Debarred student ke marks nahi save honge
            boolean isDebarred = debarmentService.isDebarred(
                    entry.getStudentId(),
                    ec.getSection().getId(),
                    ec.getSubject().getId(),
                    ec.getAcademicYear());
            if (isDebarred) {
                continue;  // Skip debarred students silently
            }

            StudentMark mark = markRepo
                    .findByExamComponentIdAndStudentId(ec.getId(), entry.getStudentId())
                    .orElseGet(() -> {
                        StudentProfile student = studentRepo.findById(entry.getStudentId())
                                .orElseThrow(() -> new IllegalArgumentException(
                                        "Student not found: " + entry.getStudentId()));
                        return StudentMark.builder().examComponent(ec).student(student).build();
                    });

            // Bug 6: maxMarks se jyada marks nahi dal sakte
            if (!entry.isAbsent() && entry.getMarksObtained() != null
                    && entry.getMarksObtained() > ec.getMaxMarks()) {
                throw new IllegalArgumentException(
                    "Marks (" + entry.getMarksObtained() + ") cannot exceed maxMarks (" +
                    ec.getMaxMarks() + ") for " + ec.getSubject().getName());
            }

            mark.setAbsent(entry.isAbsent());
            mark.setMarksObtained(entry.isAbsent() ? null : entry.getMarksObtained());
            mark.setRemarks(entry.getRemarks());
            markRepo.save(mark);
        }

        return markRepo.findAllWithStudentByComponentId(ec.getId())
                .stream().map(m -> toMarkResponse(m, ec.getMaxMarks())).toList();
    }

    // ── Publish / Unpublish Component ─────────────────────────────────────
    @Transactional
    public ExamComponentResponse togglePublish(UUID componentId) {
        ExamComponent ec = findComponent(componentId);
        ec.setPublished(!ec.isPublished());
        return toComponentResponse(componentRepo.save(ec));
    }

    // ── Delete Component ──────────────────────────────────────────────────
    @Transactional
    public void deleteComponent(UUID componentId) {
        componentRepo.deleteById(componentId);
    }

    // ── Result Report (all students in section, all subjects) ─────────────
    @Transactional(readOnly = true)
    public List<StudentResultResponse> getResult(UUID sectionId, String academicYear) {

        List<StudentProfile> students
                = studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(sectionId);
        if (students.isEmpty()) {
            return List.of();
        }

        // All components for this section+year, grouped by subject
        List<ExamComponent> allComponents
                = componentRepo.findAllBySectionIdAndAcademicYearOrderBySubjectNameAscExamTypeAsc(
                        sectionId, academicYear);
        if (allComponents.isEmpty()) {
            return List.of();
        }

        // Group components by subject
        Map<UUID, List<ExamComponent>> componentsBySubject = allComponents.stream()
                .collect(Collectors.groupingBy(ec -> ec.getSubject().getId()));

        // All marks for this section+year
        Map<UUID, Map<UUID, StudentMark>> markMap = new HashMap<>();
        // markMap: componentId → (studentId → StudentMark)
        for (ExamComponent ec : allComponents) {
            Map<UUID, StudentMark> studentMarks = markRepo
                    .findAllWithStudentByComponentId(ec.getId()).stream()
                    .collect(Collectors.toMap(m -> m.getStudent().getId(), m -> m));
            markMap.put(ec.getId(), studentMarks);
        }

        return students.stream().map(student -> {
            List<SubjectResultDto> subjectResults = new ArrayList<>();
            int totalCredits = 0;
            double totalCreditPoints = 0;
            boolean incomplete = false;

            for (Map.Entry<UUID, List<ExamComponent>> entry : componentsBySubject.entrySet()) {
                Subject subject = entry.getValue().get(0).getSubject();
                List<ExamComponent> comps = entry.getValue();

                List<ComponentMarkDto> compDtos = new ArrayList<>();
                double weightedTotal = 0;
                boolean hasAll = true;

                for (ExamComponent ec : comps) {
                    StudentMark sm = markMap
                            .getOrDefault(ec.getId(), Map.of())
                            .get(student.getId());

                    double contrib = 0;
                    Double obtained = null;
                    boolean absent = false;

                    if (sm != null) {
                        obtained = sm.getMarksObtained();
                        absent = sm.isAbsent();
                        if (!absent && obtained != null) {
                            contrib = (obtained / ec.getMaxMarks()) * ec.getWeightage();
                        }
                    } else {
                        hasAll = false;
                    }

                    weightedTotal += contrib;

                    compDtos.add(ComponentMarkDto.builder()
                            .componentId(ec.getId().toString())
                            .examType(ec.getExamType())
                            .examTypeDisplay(ec.getExamType().getDisplayName())
                            .maxMarks(ec.getMaxMarks())
                            .weightage(ec.getWeightage())
                            .marksObtained(obtained)
                            .absent(absent)
                            .contributionToTotal(Math.round(contrib * 100.0) / 100.0)
                            .build());
                }

                if (!hasAll) {
                    incomplete = true;
                }

                // Round to 2 decimal places
                // Bug fix: total weightage se normalize karo (agar sum != 100%)
                double totalWeightage = comps.stream().mapToDouble(ExamComponent::getWeightage).sum();
                double finalPct       = totalWeightage > 0
                        ? Math.round((weightedTotal / totalWeightage * 100.0) * 100.0) / 100.0
                        : 0.0;
                GradeLevel grade      = GradeLevel.fromPercentage(finalPct);
                int credits = subject.getCreditHours();
                double gradeEarned = (double) grade.getGradePoints() * credits;

                totalCredits += credits;
                totalCreditPoints += gradeEarned;

                subjectResults.add(SubjectResultDto.builder()
                        .subjectId(subject.getId())
                        .subjectCode(subject.getCode())
                        .subjectName(subject.getName())
                        .creditHours(credits)
                        .components(compDtos)
                        .totalWeightedMarks(finalPct)
                        .grade(grade)
                        .gradeLetter(grade.getLetter())
                        .gradePoints(grade.getGradePoints())
                        .gradePointsEarned(gradeEarned)
                        .build());
            }

            double sgpa = totalCredits > 0
                    ? Math.round((totalCreditPoints / totalCredits) * 100.0) / 100.0
                    : 0.0;

            boolean hasFail = subjectResults.stream()
                    .anyMatch(r -> r.getGrade() == GradeLevel.F);
            String resultStatus = incomplete ? "INCOMPLETE" : hasFail ? "FAIL" : "PASS";

            return StudentResultResponse.builder()
                    .studentId(student.getId())
                    .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                    .enrollmentNumber(student.getEnrollmentNumber())
                    .subjects(subjectResults)
                    .sgpa(sgpa)
                    .totalCredits(totalCredits)
                    .totalCreditPoints((int) totalCreditPoints)
                    .resultStatus(resultStatus)
                    .build();
        }).toList();
    }

    // ── Private helpers ───────────────────────────────────────────────────
    private ExamComponent findComponent(UUID id) {
        return componentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam component not found: " + id));
    }

    private Section findSection(UUID id) {
        return sectionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Section not found: " + id));
    }

    private Subject findSubject(UUID id) {
        return subjectRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + id));
    }

    private ExamComponentResponse toComponentResponse(ExamComponent ec) {
        long total = markRepo.findAllByExamComponentId(ec.getId()).size();
        long entered = markRepo.findAllByExamComponentId(ec.getId()).stream()
                .filter(m -> m.isAbsent() || m.getMarksObtained() != null).count();
        return ExamComponentResponse.builder()
                .id(ec.getId())
                .examType(ec.getExamType())
                .examTypeDisplay(ec.getExamType().getDisplayName())
                .maxMarks(ec.getMaxMarks())
                .weightage(ec.getWeightage())
                .academicYear(ec.getAcademicYear())
                .scheduledDate(ec.getScheduledDate())
                .published(ec.isPublished())
                .marksEntered((int) entered)
                .totalStudents((int) total)
                .subjectId(ec.getSubject().getId())
                .subjectCode(ec.getSubject().getCode())
                .subjectName(ec.getSubject().getName())
                .sectionId(ec.getSection().getId())
                .sectionName(ec.getSection().getName())
                .facultyName(ec.getFaculty() != null
                        ? ec.getFaculty().getUser().getFirstName() + " " + ec.getFaculty().getUser().getLastName()
                        : null)
                .createdAt(ec.getCreatedAt())
                .build();
    }

    private StudentMarkResponse toMarkResponse(StudentMark m, int maxMarks) {
        double obtained = m.getMarksObtained() != null ? m.getMarksObtained() : 0;
        double pct = m.isAbsent() ? 0 : (maxMarks > 0 ? (obtained / maxMarks) * 100 : 0);
        return StudentMarkResponse.builder()
                .markId(m.getId())
                .studentId(m.getStudent().getId())
                .studentName(m.getStudent().getUser().getFirstName() + " " + m.getStudent().getUser().getLastName())
                .enrollmentNumber(m.getStudent().getEnrollmentNumber())
                .marksObtained(m.getMarksObtained())
                .maxMarks(maxMarks)
                .absent(m.isAbsent())
                .percentage(Math.round(pct * 10.0) / 10.0)
                .remarks(m.getRemarks())
                .build();
    }



    // ── Bug 5: Exam se ExamComponent create karo ──────────────────────────────
    @Transactional
    public ExamComponentResponse createFromExamSchedule(UUID examScheduleId, double weightage) {
        ExamSchedule exam = examScheduleRepo.findById(examScheduleId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examScheduleId));

        if (exam.getStatus() != ExamStatus.COMPLETED) {
            throw new IllegalArgumentException(
                "Sirf COMPLETED exams se marks component create ho sakta hai. Current status: " +
                exam.getStatus().getDisplayName());
        }

        // Already exists? Return existing
        List<ExamComponent> existing = componentRepo.findAllBySectionIdAndSubjectIdAndAcademicYear(
                exam.getSection().getId(), exam.getSubject().getId(), exam.getAcademicYear());
        for (ExamComponent ec : existing) {
            if (ec.getExamType() == exam.getExamType()) {
                return toComponentResponse(ec);
            }
        }

        // Create new component
        ExamComponent ec = componentRepo.save(ExamComponent.builder()
                .section(exam.getSection())
                .subject(exam.getSubject())
                .examType(exam.getExamType())
                .maxMarks(exam.getExamType().getDefaultMaxMarks())
                .weightage(weightage)
                .academicYear(exam.getAcademicYear())
                .scheduledDate(exam.getExamDate())
                .build());

        // Pre-create empty mark rows
        studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(exam.getSection().getId())
                .forEach(s -> markRepo.save(
                        StudentMark.builder().examComponent(ec).student(s).build()));

        return toComponentResponse(ec);
    }

    // ── Bug 5: Completed exams without marks components ───────────────────────
    public List<ExamScheduleResponse> getCompletedExamsWithoutComponents(
            UUID sectionId, String academicYear) {
        return examScheduleRepo.findAllBySectionIdAndAcademicYearOrderByExamDateAscStartTimeAsc(
                        sectionId, academicYear)
                .stream()
                .filter(e -> e.getStatus() == ExamStatus.COMPLETED)
                .filter(e -> {
                    // Check if ExamComponent already exists for this exam
                    List<ExamComponent> comps = componentRepo.findAllBySectionIdAndSubjectIdAndAcademicYear(
                            sectionId, e.getSubject().getId(), academicYear);
                    return comps.stream().noneMatch(c -> c.getExamType() == e.getExamType());
                })
                .map(e -> ExamScheduleResponse.builder()
                        .id(e.getId())
                        .examType(e.getExamType()).examTypeDisplay(e.getExamType().getDisplayName())
                        .examDate(e.getExamDate()).startTime(e.getStartTime()).endTime(e.getEndTime())
                        .venue(e.getVenue()).academicYear(e.getAcademicYear())
                        .status(e.getStatus()).statusDisplay(e.getStatus().getDisplayName())
                        .subjectId(e.getSubject().getId())
                        .subjectCode(e.getSubject().getCode()).subjectName(e.getSubject().getName())
                        .sectionId(e.getSection().getId())
                        .sectionName(e.getSection().getName())
                        .build())
                .toList();
    }
}
