package com.smartcampus.erp.application.academic.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.academic.dto.CreateDepartmentRequest;
import com.smartcampus.erp.application.academic.dto.DepartmentResponse;
import com.smartcampus.erp.domain.academic.Department;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.DepartmentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository repo;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAll() {
        return repo.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public DepartmentResponse create(CreateDepartmentRequest req) {
        if (repo.existsByCode(req.getCode().toUpperCase()))
            throw new IllegalArgumentException("Code already exists: " + req.getCode());
        if (repo.existsByName(req.getName()))
            throw new IllegalArgumentException("Name already exists: " + req.getName());

        return toResponse(repo.save(Department.builder()
                .name(req.getName())
                .code(req.getCode().toUpperCase())
                .description(req.getDescription())
                .build()));
    }

    @Transactional
    public DepartmentResponse update(UUID id, CreateDepartmentRequest req) {
        Department d = findOrThrow(id);
        d.setName(req.getName());
        d.setDescription(req.getDescription());
        return toResponse(repo.save(d));
    }

    @Transactional
    public void delete(UUID id) { repo.deleteById(id); }

    private Department findOrThrow(UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Department not found: " + id));
    }

    private DepartmentResponse toResponse(Department d) {
        return DepartmentResponse.builder()
                .id(d.getId()).name(d.getName()).code(d.getCode())
                .description(d.getDescription()).active(d.isActive())
                .programCount(d.getPrograms().size())
                .createdAt(d.getCreatedAt()).build();
    }
}