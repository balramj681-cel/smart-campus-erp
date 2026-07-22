package com.smartcampus.erp.application.course.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.course.dto.AssignmentResponse;
import com.smartcampus.erp.application.course.dto.CreateAssignmentRequest;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.FacultySubjectAssignment;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultySubjectAssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final FacultySubjectAssignmentRepository assignmentRepo;
    private final FacultyProfileRepository           facultyRepo;
    private final SubjectRepository                  subjectRepo;
    private final SectionRepository                  sectionRepo;

    public Page<AssignmentResponse> getAll(
            int page, int size, String academicYear,
            UUID subjectId, UUID sectionId, UUID facultyId) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return assignmentRepo
                .search(academicYear, subjectId, sectionId, facultyId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public AssignmentResponse create(CreateAssignmentRequest req) {
        if (assignmentRepo.existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                req.getFacultyId(), req.getSubjectId(),
                req.getSectionId(), req.getAcademicYear())) {
            throw new IllegalArgumentException(
                "This faculty is already assigned to this subject in this section for " + req.getAcademicYear());
        }

        FacultyProfile faculty = facultyRepo.findById(req.getFacultyId())
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found"));
        Subject subject = subjectRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));

        return toResponse(assignmentRepo.save(FacultySubjectAssignment.builder()
                .faculty(faculty).subject(subject)
                .section(section).academicYear(req.getAcademicYear())
                .build()));
    }

    @Transactional
    public void delete(UUID id) { assignmentRepo.deleteById(id); }

    private AssignmentResponse toResponse(FacultySubjectAssignment a) {
        FacultyProfile f  = a.getFaculty();
        Subject        s  = a.getSubject();
        Section        sec = a.getSection();
        Semester       sem = sec.getSemester();
        return AssignmentResponse.builder()
                .id(a.getId()).academicYear(a.getAcademicYear()).active(a.isActive())
                .facultyId(f.getId())
                .facultyName(f.getUser().getFirstName() + " " + f.getUser().getLastName())
                .facultyEmployeeId(f.getEmployeeId())
                .facultyDesignation(f.getDesignation().name())
                .subjectId(s.getId()).subjectCode(s.getCode())
                .subjectName(s.getName()).subjectType(s.getType().name())
                .sectionId(sec.getId()).sectionName(sec.getName())
                .semesterName(sem.getName())
                .programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName())
                .createdAt(a.getCreatedAt())
                .build();
    }
}