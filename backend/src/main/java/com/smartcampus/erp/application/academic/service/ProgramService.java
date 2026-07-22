package com.smartcampus.erp.application.academic.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.academic.dto.CreateProgramRequest;
import com.smartcampus.erp.application.academic.dto.ProgramResponse;
import com.smartcampus.erp.domain.academic.Department;
import com.smartcampus.erp.domain.academic.Program;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.DepartmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ProgramRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private final ProgramRepository    repo;
    private final DepartmentRepository deptRepo;

    @Transactional(readOnly = true)
    public List<ProgramResponse> getAll() {
        return repo.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProgramResponse> getByDepartment(UUID deptId) {
        return repo.findAllByDepartmentIdOrderByNameAsc(deptId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProgramResponse create(CreateProgramRequest req) {
        if (repo.existsByCodeAndDepartmentId(req.getCode().toUpperCase(), req.getDepartmentId()))
            throw new IllegalArgumentException("Program code already exists in this department");

        Department dept = deptRepo.findById(req.getDepartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));

        return toResponse(repo.save(Program.builder()
                .name(req.getName()).code(req.getCode().toUpperCase())
                .degree(req.getDegree()).durationYears(req.getDurationYears())
                .department(dept).build()));
    }

    @Transactional
    public ProgramResponse update(UUID id, CreateProgramRequest req) {
        Program p = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Program not found: " + id));
        p.setName(req.getName());
        p.setDegree(req.getDegree());
        p.setDurationYears(req.getDurationYears());
        return toResponse(repo.save(p));
    }

    @Transactional
    public void delete(UUID id) { repo.deleteById(id); }

    private ProgramResponse toResponse(Program p) {
        return ProgramResponse.builder()
                .id(p.getId()).name(p.getName()).code(p.getCode())
                .degree(p.getDegree()).durationYears(p.getDurationYears()).active(p.isActive())
                .departmentId(p.getDepartment().getId()).departmentName(p.getDepartment().getName())
                .semesterCount(p.getSemesters().size()).createdAt(p.getCreatedAt()).build();
    }
}