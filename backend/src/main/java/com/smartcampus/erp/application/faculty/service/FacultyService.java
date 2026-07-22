package com.smartcampus.erp.application.faculty.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.faculty.dto.CreateFacultyRequest;
import com.smartcampus.erp.application.faculty.dto.FacultyResponse;
import com.smartcampus.erp.application.faculty.dto.UpdateFacultyRequest;
import com.smartcampus.erp.domain.academic.Department;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.DepartmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;

import com.smartcampus.erp.application.faculty.dto.LinkFacultyProfileRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyProfileRepository facultyRepo;
    private final DepartmentRepository deptRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    // ── List ──────────────────────────────────────────────────────────────
    public Page<FacultyResponse> getAll(
            int page, int size, String search,
            UUID departmentId, Designation designation) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";

        return facultyRepo.search(q, departmentId, designation, pageable)
                .map(this::toResponse);
    }

    // ── Single ────────────────────────────────────────────────────────────
    public FacultyResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // ── Create ────────────────────────────────────────────────────────────
    @Transactional
    public FacultyResponse create(CreateFacultyRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + req.getEmail());
        }
        if (facultyRepo.existsByEmployeeId(req.getEmployeeId())) {
            throw new IllegalArgumentException("Employee ID already exists: " + req.getEmployeeId());
        }

        // 1 — Create User account
        User user = userRepo.save(User.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail().toLowerCase())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.FACULTY)
                .enabled(true)
                .emailVerified(true)
                .build());

        // 2 — Resolve department (optional)
        Department dept = req.getDepartmentId() != null
                ? deptRepo.findById(req.getDepartmentId()).orElse(null)
                : null;

        // 3 — Create FacultyProfile
        FacultyProfile profile = facultyRepo.save(FacultyProfile.builder()
                .user(user)
                .employeeId(req.getEmployeeId())
                .department(dept)
                .designation(req.getDesignation())
                .employmentType(req.getEmploymentType() != null
                        ? req.getEmploymentType() : EmploymentType.FULL_TIME)
                .qualification(req.getQualification())
                .specialization(req.getSpecialization())
                .researchInterests(req.getResearchInterests())
                .experienceYears(req.getExperienceYears())
                .gender(req.getGender())
                .dateOfBirth(req.getDateOfBirth())
                .joiningDate(req.getJoiningDate())
                .phone(req.getPhone())
                .officeRoom(req.getOfficeRoom())
                .build());

        return toResponse(profile);
    }

    // ── Update ────────────────────────────────────────────────────────────
    @Transactional
    public FacultyResponse update(UUID id, UpdateFacultyRequest req) {
        FacultyProfile f = findOrThrow(id);

        if (req.getFirstName() != null) {
            f.getUser().setFirstName(req.getFirstName());
        }
        if (req.getLastName() != null) {
            f.getUser().setLastName(req.getLastName());
        }
        if (req.getPhone() != null) {
            f.setPhone(req.getPhone());
        }
        if (req.getDesignation() != null) {
            f.setDesignation(req.getDesignation());
        }
        if (req.getEmploymentType() != null) {
            f.setEmploymentType(req.getEmploymentType());
        }
        if (req.getQualification() != null) {
            f.setQualification(req.getQualification());
        }
        if (req.getSpecialization() != null) {
            f.setSpecialization(req.getSpecialization());
        }
        if (req.getResearchInterests() != null) {
            f.setResearchInterests(req.getResearchInterests());
        }
        if (req.getExperienceYears() != null) {
            f.setExperienceYears(req.getExperienceYears());
        }
        if (req.getGender() != null) {
            f.setGender(req.getGender());
        }
        if (req.getDateOfBirth() != null) {
            f.setDateOfBirth(req.getDateOfBirth());
        }
        if (req.getJoiningDate() != null) {
            f.setJoiningDate(req.getJoiningDate());
        }
        if (req.getOfficeRoom() != null) {
            f.setOfficeRoom(req.getOfficeRoom());
        }
        if (req.getDepartmentId() != null) {
            Department dept = deptRepo.findById(req.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found"));
            f.setDepartment(dept);
        }

        userRepo.save(f.getUser());
        return toResponse(facultyRepo.save(f));
    }

    // ── Toggle Active ─────────────────────────────────────────────────────
    @Transactional
    public FacultyResponse toggleActive(UUID id) {
        FacultyProfile f = findOrThrow(id);
        f.setActive(!f.isActive());
        f.getUser().setEnabled(f.isActive());
        userRepo.save(f.getUser());
        return toResponse(facultyRepo.save(f));
    }

    // ── Delete ────────────────────────────────────────────────────────────
    @Transactional
    public void delete(UUID id) {
        FacultyProfile f = findOrThrow(id);
        facultyRepo.delete(f);
        userRepo.delete(f.getUser());
    }

    // ── Existing User (jo pehle se signed-up hai, jise abhi FACULTY role mila) ──
// ke saath FacultyProfile link karo — na ki naya User bana ke.
    @Transactional
    public FacultyResponse linkExistingUser(UUID userId, LinkFacultyProfileRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (facultyRepo.existsByUserId(userId)) {
            throw new IllegalArgumentException("Ye user pehle se ek Faculty profile rakhta hai.");
        }
        if (facultyRepo.existsByEmployeeId(req.getEmployeeId())) {
            throw new IllegalArgumentException("Employee ID already exists: " + req.getEmployeeId());
        }

        user.setRole(Role.FACULTY);
        userRepo.save(user);

        Department dept = req.getDepartmentId() != null
                ? deptRepo.findById(req.getDepartmentId()).orElse(null)
                : null;

        FacultyProfile profile = facultyRepo.save(FacultyProfile.builder()
                .user(user)
                .employeeId(req.getEmployeeId())
                .department(dept)
                .designation(req.getDesignation())
                .employmentType(req.getEmploymentType() != null ? req.getEmploymentType() : EmploymentType.FULL_TIME)
                .qualification(req.getQualification())
                .specialization(req.getSpecialization())
                .researchInterests(req.getResearchInterests())
                .experienceYears(req.getExperienceYears())
                .gender(req.getGender())
                .dateOfBirth(req.getDateOfBirth())
                .joiningDate(req.getJoiningDate())
                .phone(req.getPhone())
                .officeRoom(req.getOfficeRoom())
                .build());

        return toResponse(profile);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private FacultyProfile findOrThrow(UUID id) {
        return facultyRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Faculty not found: " + id));
    }

    private FacultyResponse toResponse(FacultyProfile f) {
        User u = f.getUser();
        Department d = f.getDepartment();
        return FacultyResponse.builder()
                .id(f.getId()).userId(u.getId())
                .firstName(u.getFirstName()).lastName(u.getLastName())
                .email(u.getEmail()).phone(f.getPhone())
                .userEnabled(u.isEnabled())
                .employeeId(f.getEmployeeId())
                .departmentId(d != null ? d.getId() : null)
                .departmentName(d != null ? d.getName() : null)
                .designation(f.getDesignation())
                .employmentType(f.getEmploymentType())
                .qualification(f.getQualification())
                .specialization(f.getSpecialization())
                .researchInterests(f.getResearchInterests())
                .experienceYears(f.getExperienceYears())
                .gender(f.getGender())
                .dateOfBirth(f.getDateOfBirth())
                .joiningDate(f.getJoiningDate())
                .officeRoom(f.getOfficeRoom())
                .active(f.isActive())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
