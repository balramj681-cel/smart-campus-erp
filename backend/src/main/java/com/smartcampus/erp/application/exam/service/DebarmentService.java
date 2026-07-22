package com.smartcampus.erp.application.exam.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.domain.academic.ExamDebarment;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ExamDebarmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DebarmentService {

    private final ExamDebarmentRepository  debarRepo;
    private final StudentProfileRepository studentRepo;
    private final SectionRepository        sectionRepo;
    private final SubjectRepository        subjectRepo;
    private final UserRepository           userRepo;

    // ── Debar ────────────────────────────────────────────────────────────────
    @Transactional
    public void debar(UUID studentId, UUID sectionId, UUID subjectId,
                      String academicYear, String reason, String debarredByEmail) {

        if (debarRepo.existsByStudentIdAndSectionIdAndSubjectIdAndAcademicYearAndActiveTrue(
                studentId, sectionId, subjectId, academicYear)) {
            throw new IllegalArgumentException("Student already debarred for this subject.");
        }

        StudentProfile student = studentRepo.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        Section section = sectionRepo.findById(sectionId)
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));
        Subject subject = subjectRepo.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        var admin = userRepo.findByEmail(debarredByEmail).orElse(null);

        debarRepo.save(ExamDebarment.builder()
                .student(student).section(section).subject(subject)
                .academicYear(academicYear).reason(reason)
                .debarredBy(admin).active(true).build());
    }

    // ── Lift debarment ────────────────────────────────────────────────────────
    @Transactional
    public void liftDebarment(UUID studentId, UUID sectionId, UUID subjectId, String academicYear) {
        debarRepo.findByStudentIdAndSectionIdAndSubjectIdAndAcademicYear(
                studentId, sectionId, subjectId, academicYear)
                .ifPresent(d -> {
                    d.setActive(false);
                    debarRepo.save(d);
                });
    }

    // ── Check single student ───────────────────────────────────────────────────
    public boolean isDebarred(UUID studentId, UUID sectionId, UUID subjectId, String academicYear) {
        return debarRepo.existsByStudentIdAndSectionIdAndSubjectIdAndAcademicYearAndActiveTrue(
                studentId, sectionId, subjectId, academicYear);
    }

    // ── Get all debarred students in section ───────────────────────────────────
    public Map<String, List<UUID>> getDebarredStudentsBySubject(UUID sectionId, String academicYear) {
        return debarRepo.findAllBySectionIdAndAcademicYearAndActiveTrue(sectionId, academicYear)
                .stream()
                .collect(Collectors.groupingBy(
                        d -> d.getSubject().getId().toString(),
                        Collectors.mapping(d -> d.getStudent().getId(), Collectors.toList())
                ));
    }
}