package com.smartcampus.erp.application.course.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.course.dto.CreateSubjectRequest;
import com.smartcampus.erp.application.course.dto.SubjectResponse;
import com.smartcampus.erp.application.course.dto.UpdateSubjectRequest;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SemesterRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository  subjectRepo;
    private final SemesterRepository semesterRepo;

    public Page<SubjectResponse> getAll(int page, int size, String search, UUID semesterId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return subjectRepo.search(q, semesterId, pageable).map(this::toResponse);
    }

    public SubjectResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public SubjectResponse create(CreateSubjectRequest req) {
        if (subjectRepo.existsByCode(req.getCode().toUpperCase()))
            throw new IllegalArgumentException("Subject code already exists: " + req.getCode());

        Semester semester = semesterRepo.findById(req.getSemesterId())
                .orElseThrow(() -> new IllegalArgumentException("Semester not found"));

        return toResponse(subjectRepo.save(Subject.builder()
                .code(req.getCode().toUpperCase())
                .name(req.getName())
                .creditHours(req.getCreditHours())
                .weeklyHours(req.getWeeklyHours())
                .type(req.getType())
                .description(req.getDescription())
                .semester(semester)
                .build()));
    }

    @Transactional
    public SubjectResponse update(UUID id, UpdateSubjectRequest req) {
        Subject s = findOrThrow(id);
        if (req.getName()        != null) s.setName(req.getName());
        if (req.getCreditHours() != null) s.setCreditHours(req.getCreditHours());
        if (req.getWeeklyHours() != null) s.setWeeklyHours(req.getWeeklyHours());
        if (req.getType()        != null) s.setType(req.getType());
        if (req.getDescription() != null) s.setDescription(req.getDescription());
        return toResponse(subjectRepo.save(s));
    }

    @Transactional
    public void delete(UUID id) { subjectRepo.deleteById(id); }

    // ── Used by AssignSection modal (dropdown) ────────────────────────────
    public java.util.List<SubjectResponse> getBySemester(UUID semesterId) {
        return subjectRepo.findAllBySemesterIdOrderByNameAsc(semesterId)
                .stream().map(this::toResponse).toList();
    }

    private Subject findOrThrow(UUID id) {
        return subjectRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + id));
    }

    private SubjectResponse toResponse(Subject s) {
        Semester sem  = s.getSemester();
        var      prog = sem.getProgram();
        var      dept = prog.getDepartment();
        return SubjectResponse.builder()
                .id(s.getId()).code(s.getCode()).name(s.getName())
                .creditHours(s.getCreditHours()).weeklyHours(s.getWeeklyHours())
                .type(s.getType()).description(s.getDescription()).active(s.isActive())
                .semesterId(sem.getId()).semesterName(sem.getName())
                .programId(prog.getId()).programName(prog.getName())
                .departmentId(dept.getId()).departmentName(dept.getName())
                .createdAt(s.getCreatedAt())
                .build();
    }
}