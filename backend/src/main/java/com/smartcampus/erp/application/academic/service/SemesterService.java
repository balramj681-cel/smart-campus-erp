package com.smartcampus.erp.application.academic.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.academic.dto.CreateSemesterRequest;
import com.smartcampus.erp.application.academic.dto.SemesterResponse;
import com.smartcampus.erp.domain.academic.Program;
import com.smartcampus.erp.domain.academic.Semester;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.ProgramRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SemesterRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository repo;
    private final ProgramRepository  programRepo;

    @Transactional(readOnly = true)
    public List<SemesterResponse> getByProgram(UUID programId) {
        return repo.findAllByProgramIdOrderBySemesterNumberAsc(programId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public SemesterResponse create(CreateSemesterRequest req) {
        if (repo.existsByProgramIdAndSemesterNumber(req.getProgramId(), req.getSemesterNumber()))
            throw new IllegalArgumentException(
                    "Semester " + req.getSemesterNumber() + " already exists in this program");

        Program program = programRepo.findById(req.getProgramId())
                .orElseThrow(() -> new IllegalArgumentException("Program not found"));

        return toResponse(repo.save(Semester.builder()
                .semesterNumber(req.getSemesterNumber())
                .name(req.getName()).program(program).build()));
    }

    @Transactional
    public SemesterResponse update(UUID id, CreateSemesterRequest req) {
        Semester s = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Semester not found: " + id));
        s.setName(req.getName());
        return toResponse(repo.save(s));
    }

    @Transactional
    public void delete(UUID id) { repo.deleteById(id); }

    private SemesterResponse toResponse(Semester s) {
        return SemesterResponse.builder()
                .id(s.getId()).semesterNumber(s.getSemesterNumber()).name(s.getName())
                .active(s.isActive()).programId(s.getProgram().getId())
                .programName(s.getProgram().getName())
                .sectionCount(s.getSections().size()).build();
    }
}