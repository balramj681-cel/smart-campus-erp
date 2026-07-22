package com.smartcampus.erp.application.academic.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.academic.dto.CreateSectionRequest;
import com.smartcampus.erp.application.academic.dto.SectionResponse;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SemesterRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository  repo;
    private final SemesterRepository semesterRepo;

    @Transactional(readOnly = true)
    public List<SectionResponse> getBySemester(UUID semesterId) {
        return repo.findAllBySemesterIdOrderByNameAsc(semesterId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public SectionResponse create(CreateSectionRequest req) {
        if (repo.existsBySemesterIdAndName(req.getSemesterId(), req.getName().toUpperCase()))
            throw new IllegalArgumentException(
                    "Section '" + req.getName() + "' already exists in this semester");

        Semester semester = semesterRepo.findById(req.getSemesterId())
                .orElseThrow(() -> new IllegalArgumentException("Semester not found"));

        return toResponse(repo.save(Section.builder()
                .name(req.getName().toUpperCase())
                .maxCapacity(req.getMaxCapacity())
                .semester(semester).build()));
    }

    @Transactional
    public SectionResponse update(UUID id, CreateSectionRequest req) {
        Section s = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Section not found: " + id));
        s.setName(req.getName().toUpperCase());
        s.setMaxCapacity(req.getMaxCapacity());
        return toResponse(repo.save(s));
    }

    @Transactional
    public void delete(UUID id) { repo.deleteById(id); }

    private SectionResponse toResponse(Section s) {
        Semester sem = s.getSemester();
        return SectionResponse.builder()
                .id(s.getId()).name(s.getName()).maxCapacity(s.getMaxCapacity())
                .currentStrength(s.getCurrentStrength()).active(s.isActive())
                .semesterId(sem.getId()).semesterName(sem.getName())
                .programName(sem.getProgram().getName())
                .departmentName(sem.getProgram().getDepartment().getName()).build();
    }
}