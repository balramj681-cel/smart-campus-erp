package com.smartcampus.erp.application.coursework.service;

import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.coursework.dto.AssignmentResponse;
import com.smartcampus.erp.application.coursework.dto.CreateAssignmentRequest;
import com.smartcampus.erp.application.coursework.dto.TeachingLoadResponse;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.Section;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.academic.Subject;
import com.smartcampus.erp.domain.coursework.Assignment;
import com.smartcampus.erp.domain.coursework.AssignmentSubmission;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultySubjectAssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SectionRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.SubjectRepository;
import com.smartcampus.erp.infrastructure.persistence.coursework.repository.AssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.coursework.repository.AssignmentSubmissionRepository;
import com.smartcampus.erp.infrastructure.storage.FileStorageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourseworkAssignmentService {

    private static final String ATTACHMENT_SUBDIR = "assignment-attachments";

    private final AssignmentRepository               assignmentRepo;
    private final AssignmentSubmissionRepository      submissionRepo;
    private final FacultyProfileRepository            facultyRepo;
    private final SubjectRepository                   subjectRepo;
    private final SectionRepository                   sectionRepo;
    private final StudentProfileRepository            studentRepo;
    private final FacultySubjectAssignmentRepository  teachingAssignmentRepo;
    private final NotificationService                 notificationService;
    private final FileStorageService                  fileStorageService;

    // ── Create ───────────────────────────────────────────────────────────

    @Transactional
    public AssignmentResponse create(
            CreateAssignmentRequest req, MultipartFile attachment, String userEmail, boolean isFacultyOrHod) {
        FacultyProfile faculty = resolveFaculty(req.getFacultyId(), userEmail);
        Subject subject = subjectRepo.findById(req.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        Section section = sectionRepo.findById(req.getSectionId())
                .orElseThrow(() -> new IllegalArgumentException("Section not found"));

        if (isFacultyOrHod && !teachingAssignmentRepo.existsByFacultyIdAndSubjectIdAndSectionIdAndAcademicYear(
                faculty.getId(), req.getSubjectId(), req.getSectionId(), req.getAcademicYear())) {
            throw new AccessDeniedException(
                "Aap '" + subject.getName() + "' is section mein padhane ke liye assign nahi hain.");
        }

        Assignment.AssignmentBuilder builder = Assignment.builder()
                .subject(subject).section(section).faculty(faculty)
                .title(req.getTitle()).description(req.getDescription())
                .dueDate(req.getDueDate()).maxMarks(req.getMaxMarks())
                .academicYear(req.getAcademicYear());

        if (attachment != null && !attachment.isEmpty()) {
            String stored = fileStorageService.store(attachment, ATTACHMENT_SUBDIR);
            builder.attachmentFileName(attachment.getOriginalFilename())
                   .attachmentStoredFileName(stored)
                   .attachmentSize(attachment.getSize())
                   .attachmentContentType(attachment.getContentType());
        }

        Assignment assignment = assignmentRepo.save(builder.build());

        notifyStudentsOfNewAssignment(assignment);

        return toResponse(assignment, null);
    }

    // ── Update ───────────────────────────────────────────────────────────

    @Transactional
    public AssignmentResponse update(UUID id, CreateAssignmentRequest req) {
        Assignment assignment = findOrThrow(id);
        assignment.setTitle(req.getTitle());
        assignment.setDescription(req.getDescription());
        assignment.setDueDate(req.getDueDate());
        assignment.setMaxMarks(req.getMaxMarks());
        return toResponse(assignmentRepo.save(assignment), null);
    }

    @Transactional
    public AssignmentResponse toggleActive(UUID id) {
        Assignment assignment = findOrThrow(id);
        assignment.setActive(!assignment.isActive());
        return toResponse(assignmentRepo.save(assignment), null);
    }

    @Transactional
    public void delete(UUID id) {
        long submissionCount = submissionRepo.countByAssignmentId(id);
        if (submissionCount > 0) {
            throw new IllegalArgumentException(
                "Cannot delete: " + submissionCount + " student(s) have already submitted.");
        }
        assignmentRepo.deleteById(id);
    }

    // ── Faculty/Admin listing ────────────────────────────────────────────

    public Page<AssignmentResponse> getAll(
            UUID sectionId, UUID subjectId, UUID facultyId, String academicYear, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return assignmentRepo.search(sectionId, subjectId, facultyId, academicYear, pageable)
                .map(a -> toResponse(a, null));
    }

    /**
     * Faculty's own listing — always scoped to the authenticated faculty
     * member, regardless of what a caller might try to pass. This is what
     * the faculty "Assignments" page actually calls, so one faculty member
     * never sees another's assignments.
     */
    public Page<AssignmentResponse> getMyCreatedAssignments(String userEmail, String academicYear, int page, int size) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));
        Pageable pageable = PageRequest.of(page, size);
        return assignmentRepo.search(null, null, faculty.getId(), academicYear, pageable)
                .map(a -> toResponse(a, null));
    }

    public AssignmentResponse getById(UUID id) {
        return toResponse(findOrThrow(id), null);
    }

    // ── Student listing ──────────────────────────────────────────────────

    public List<AssignmentResponse> getForStudent(String userEmail, String academicYear) {
        StudentProfile student = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null) {
            return List.of();
        }

        return assignmentRepo.findAllBySectionIdAndAcademicYearAndActiveTrueOrderByDueDateAsc(
                        student.getCurrentSection().getId(), academicYear)
                .stream()
                .map(a -> toResponse(a, student.getId()))
                .toList();
    }

    // ── Faculty: what do I teach? (for the assignment-creation picker) ──

    public List<TeachingLoadResponse> getMyTeachingLoad(String userEmail, String academicYear) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));

        return teachingAssignmentRepo.findAllByFacultyIdAndAcademicYear(faculty.getId(), academicYear)
                .stream()
                .map(a -> TeachingLoadResponse.builder()
                        .subjectId(a.getSubject().getId())
                        .subjectCode(a.getSubject().getCode())
                        .subjectName(a.getSubject().getName())
                        .sectionId(a.getSection().getId())
                        .sectionName(a.getSection().getName())
                        .build())
                .toList();
    }

    // ── Attachment download ──────────────────────────────────────────────

    public Assignment getAssignmentForAttachmentDownload(UUID id, String userEmail, boolean isAdmin) {
        Assignment assignment = findOrThrow(id);
        if (assignment.getAttachmentStoredFileName() == null) {
            throw new IllegalArgumentException("This assignment has no attachment.");
        }
        if (isAdmin) return assignment;

        boolean isOwnerFaculty = facultyRepo.findByUserEmail(userEmail)
                .map(f -> f.getId().equals(assignment.getFaculty().getId()))
                .orElse(false);
        boolean isStudentInSection = studentRepo.findByUserEmail(userEmail)
                .map(s -> s.getCurrentSection() != null
                        && s.getCurrentSection().getId().equals(assignment.getSection().getId()))
                .orElse(false);

        if (!isOwnerFaculty && !isStudentInSection) {
            throw new AccessDeniedException("Aapko is file ko download karne ki permission nahi hai.");
        }
        return assignment;
    }

    public Resource loadAttachmentResource(Assignment assignment) {
        return fileStorageService.loadAsResource(ATTACHMENT_SUBDIR, assignment.getAttachmentStoredFileName());
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private FacultyProfile resolveFaculty(UUID requestedFacultyId, String userEmail) {
        if (requestedFacultyId != null) {
            return facultyRepo.findById(requestedFacultyId)
                    .orElseThrow(() -> new IllegalArgumentException("Faculty not found"));
        }
        return facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));
    }

    private void notifyStudentsOfNewAssignment(Assignment assignment) {
        List<StudentProfile> students =
                studentRepo.findAllByCurrentSectionIdOrderByUserFirstNameAsc(assignment.getSection().getId());
        for (StudentProfile student : students) {
            notificationService.pushToUser(
                    student.getUser(),
                    "New Assignment: " + assignment.getTitle(),
                    assignment.getSubject().getName() + " — due " + assignment.getDueDate() + ".",
                    NotificationType.ASSIGNMENT,
                    assignment.getId());
        }
    }

    private Assignment findOrThrow(UUID id) {
        return assignmentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));
    }

    private AssignmentResponse toResponse(Assignment a, UUID viewingStudentId) {
        AssignmentSubmission mySubmission = viewingStudentId != null
                ? submissionRepo.findByAssignmentIdAndStudentId(a.getId(), viewingStudentId).orElse(null)
                : null;

        return AssignmentResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .description(a.getDescription())
                .dueDate(a.getDueDate())
                .maxMarks(a.getMaxMarks())
                .academicYear(a.getAcademicYear())
                .active(a.isActive())
                .pastDue(a.isPastDue())
                .subjectId(a.getSubject().getId())
                .subjectCode(a.getSubject().getCode())
                .subjectName(a.getSubject().getName())
                .sectionId(a.getSection().getId())
                .sectionName(a.getSection().getName())
                .facultyId(a.getFaculty().getId())
                .facultyName(a.getFaculty().getUser().getFirstName() + " " + a.getFaculty().getUser().getLastName())
                .submissionCount(submissionRepo.countByAssignmentId(a.getId()))
                .hasAttachment(a.getAttachmentStoredFileName() != null)
                .attachmentFileName(a.getAttachmentFileName())
                .mySubmissionStatus(mySubmission != null ? mySubmission.getStatus().name() : null)
                .mySubmissionGraded(mySubmission != null && mySubmission.getMarksObtained() != null)
                .createdAt(a.getCreatedAt())
                .build();
    }
}