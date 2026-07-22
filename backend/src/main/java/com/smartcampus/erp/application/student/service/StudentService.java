package com.smartcampus.erp.application.student.service;

import com.smartcampus.erp.application.student.dto.*;
import com.smartcampus.erp.domain.academic.*;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.EnrollmentStatus;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.*;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentProfileRepository studentRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final SectionRepository sectionRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    // ── List ───────────────────────────────────────────────────────────────
    public Page<StudentResponse> getAll(int page, int size, String search, Integer batch) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return studentRepo.search(q, batch, pageable).map(this::toResponse);
    }

    // ── Single ─────────────────────────────────────────────────────────────
    public StudentResponse getById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // ── Create (User + Profile together) ───────────────────────────────────
    @Transactional
    public StudentResponse create(CreateStudentRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + req.getEmail());
        }
        if (studentRepo.existsByEnrollmentNumber(req.getEnrollmentNumber())) {
            throw new IllegalArgumentException("Enrollment number already exists: " + req.getEnrollmentNumber());
        }

        // 1. Create User account
        User user = userRepo.save(User.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail().toLowerCase())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.STUDENT)
                .enabled(true)
                .emailVerified(true)
                .build());

        // 2. Create StudentProfile
        StudentProfile profile = studentRepo.save(StudentProfile.builder()
                .user(user)
                .enrollmentNumber(req.getEnrollmentNumber())
                .batch(req.getBatch())
                .admissionDate(req.getAdmissionDate())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .bloodGroup(req.getBloodGroup())
                .phone(req.getPhone())
                .address(req.getAddress())
                .guardianName(req.getGuardianName())
                .guardianContact(req.getGuardianContact())
                .build());

        return toResponse(profile);
    }

    // ── Existing User ke saath StudentProfile link karo ─────────────────────
    @Transactional
    public StudentResponse linkExistingUser(UUID userId, LinkStudentProfileRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (studentRepo.existsByUserId(userId)) {
            throw new IllegalArgumentException("Ye user pehle se ek Student profile rakhta hai.");
        }
        if (studentRepo.existsByEnrollmentNumber(req.getEnrollmentNumber())) {
            throw new IllegalArgumentException("Enrollment number already exists: " + req.getEnrollmentNumber());
        }

        user.setRole(Role.STUDENT);
        userRepo.save(user);

        StudentProfile profile = studentRepo.save(StudentProfile.builder()
                .user(user)
                .enrollmentNumber(req.getEnrollmentNumber())
                .batch(req.getBatch())
                .admissionDate(req.getAdmissionDate())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .bloodGroup(req.getBloodGroup())
                .phone(req.getPhone())
                .address(req.getAddress())
                .guardianName(req.getGuardianName())
                .guardianContact(req.getGuardianContact())
                .build());

        return toResponse(profile);
    }

    // ── Update ─────────────────────────────────────────────────────────────
    @Transactional
    public StudentResponse update(UUID id, UpdateStudentRequest req) {
        StudentProfile s = findOrThrow(id);

        if (req.getFirstName() != null) {
            s.getUser().setFirstName(req.getFirstName());
        }
        if (req.getLastName() != null) {
            s.getUser().setLastName(req.getLastName());
        }
        if (req.getPhone() != null) {
            s.setPhone(req.getPhone());
        }
        if (req.getDateOfBirth() != null) {
            s.setDateOfBirth(req.getDateOfBirth());
        }
        if (req.getGender() != null) {
            s.setGender(req.getGender());
        }
        if (req.getBloodGroup() != null) {
            s.setBloodGroup(req.getBloodGroup());
        }
        if (req.getAddress() != null) {
            s.setAddress(req.getAddress());
        }
        if (req.getGuardianName() != null) {
            s.setGuardianName(req.getGuardianName());
        }
        if (req.getGuardianContact() != null) {
            s.setGuardianContact(req.getGuardianContact());
        }
        if (req.getAdmissionDate() != null) {
            s.setAdmissionDate(req.getAdmissionDate());
        }

        userRepo.save(s.getUser());
        return toResponse(studentRepo.save(s));
    }

    // ── Assign Section ─────────────────────────────────────────────────────
    @Transactional
    public StudentResponse assignSection(UUID studentId, AssignSectionRequest req) {
        StudentProfile student = findOrThrow(studentId);
        Section newSection = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));

        // Capacity check
        if (newSection.getCurrentStrength() >= newSection.getMaxCapacity()) {
            throw new IllegalStateException("Section '" + newSection.getName() + "' is full.");
        }

        // Close previous active enrollment
        enrollmentRepo.findByStudentIdAndStatus(studentId, EnrollmentStatus.ACTIVE)
                .ifPresent(e -> {
                    e.setStatus(EnrollmentStatus.COMPLETED);
                    enrollmentRepo.save(e);
                    // Decrement old section strength
                    Section old = e.getSection();
                    old.setCurrentStrength(Math.max(0, old.getCurrentStrength() - 1));
                    sectionRepo.save(old);
                });

        // Create new enrollment
        enrollmentRepo.save(Enrollment.builder()
                .student(student).section(newSection)
                .status(EnrollmentStatus.ACTIVE).build());

        // Update section strength + student current section
        newSection.setCurrentStrength(newSection.getCurrentStrength() + 1);
        sectionRepo.save(newSection);

        student.setCurrentSection(newSection);
        return toResponse(studentRepo.save(student));
    }

    // ── Remove Section ─────────────────────────────────────────────────────
    @Transactional
    public StudentResponse removeSection(UUID studentId) {
        StudentProfile student = findOrThrow(studentId);

        enrollmentRepo.findByStudentIdAndStatus(studentId, EnrollmentStatus.ACTIVE)
                .ifPresent(e -> {
                    e.setStatus(EnrollmentStatus.DROPPED);
                    enrollmentRepo.save(e);
                    Section sec = e.getSection();
                    sec.setCurrentStrength(Math.max(0, sec.getCurrentStrength() - 1));
                    sectionRepo.save(sec);
                });

        student.setCurrentSection(null);
        return toResponse(studentRepo.save(student));
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    @Transactional
    public void delete(UUID id) {
        StudentProfile s = findOrThrow(id);
        // Decrement section if assigned
        if (s.getCurrentSection() != null) {
            Section sec = s.getCurrentSection();
            sec.setCurrentStrength(Math.max(0, sec.getCurrentStrength() - 1));
            sectionRepo.save(sec);
        }
        studentRepo.delete(s);
        userRepo.delete(s.getUser());
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private StudentProfile findOrThrow(UUID id) {
        return studentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + id));
    }

    private StudentResponse toResponse(StudentProfile s) {
        User u = s.getUser();
        Section sec = s.getCurrentSection();

        return StudentResponse.builder()
                .id(s.getId()).userId(u.getId())
                .firstName(u.getFirstName()).lastName(u.getLastName())
                .email(u.getEmail()).phone(s.getPhone())
                .userEnabled(u.isEnabled())
                .enrollmentNumber(s.getEnrollmentNumber())
                .batch(s.getBatch()).admissionDate(s.getAdmissionDate())
                .dateOfBirth(s.getDateOfBirth()).gender(s.getGender())
                .bloodGroup(s.getBloodGroup()).address(s.getAddress())
                .guardianName(s.getGuardianName()).guardianContact(s.getGuardianContact())
                .currentSectionId(sec != null ? sec.getId() : null)
                .currentSectionName(sec != null ? sec.getName() : null)
                .currentSemesterName(sec != null ? sec.getSemester().getName() : null)
                .currentProgramName(sec != null ? sec.getSemester().getProgram().getName() : null)
                .currentDepartmentName(sec != null ? sec.getSemester().getProgram().getDepartment().getName() : null)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
