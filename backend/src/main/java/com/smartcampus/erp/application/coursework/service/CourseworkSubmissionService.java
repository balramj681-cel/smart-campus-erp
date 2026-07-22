package com.smartcampus.erp.application.coursework.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.erp.application.coursework.dto.GradeSubmissionRequest;
import com.smartcampus.erp.application.coursework.dto.SubmissionResponse;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.coursework.Assignment;
import com.smartcampus.erp.domain.coursework.AssignmentSubmission;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.domain.shared.enums.SubmissionStatus;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.coursework.repository.AssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.coursework.repository.AssignmentSubmissionRepository;
import com.smartcampus.erp.infrastructure.storage.FileStorageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourseworkSubmissionService {

    private static final String STORAGE_SUBDIR = "assignments";

    private final AssignmentSubmissionRepository submissionRepo;
    private final AssignmentRepository           assignmentRepo;
    private final StudentProfileRepository       studentRepo;
    private final FacultyProfileRepository       facultyRepo;
    private final FileStorageService             fileStorageService;
    private final NotificationService            notificationService;

    // ── Submit / Resubmit ────────────────────────────────────────────────

    @Transactional
    public SubmissionResponse submit(UUID assignmentId, MultipartFile file, String userEmail) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
        StudentProfile student = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (student.getCurrentSection() == null
                || !student.getCurrentSection().getId().equals(assignment.getSection().getId())) {
            throw new AccessDeniedException("This assignment isn't for your section.");
        }
        if (!assignment.isActive()) {
            throw new IllegalArgumentException("This assignment is no longer accepting submissions.");
        }

        AssignmentSubmission existing = submissionRepo
                .findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElse(null);

        if (existing != null && existing.getStatus() == SubmissionStatus.GRADED) {
            throw new IllegalArgumentException("This submission has already been graded and can't be replaced.");
        }

        String storedFileName = fileStorageService.store(file, STORAGE_SUBDIR);
        SubmissionStatus status = LocalDateTime.now().isAfter(assignment.getDueDate())
                ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

        if (existing != null) {
            fileStorageService.delete(STORAGE_SUBDIR, existing.getStoredFileName());
            existing.setOriginalFileName(file.getOriginalFilename());
            existing.setStoredFileName(storedFileName);
            existing.setFileSize(file.getSize());
            existing.setContentType(file.getContentType());
            existing.setStatus(status);
            return toResponse(submissionRepo.save(existing));
        }

        AssignmentSubmission submission = submissionRepo.save(AssignmentSubmission.builder()
                .assignment(assignment)
                .student(student)
                .originalFileName(file.getOriginalFilename())
                .storedFileName(storedFileName)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .status(status)
                .build());

        notificationService.pushToUser(
                assignment.getFaculty().getUser(),
                "New Submission",
                student.getUser().getFirstName() + " " + student.getUser().getLastName()
                        + " submitted " + assignment.getTitle() + ".",
                NotificationType.ASSIGNMENT,
                assignment.getId());

        return toResponse(submission);
    }

    // ── Faculty: view submissions for an assignment ─────────────────────

    public List<SubmissionResponse> getSubmissionsForAssignment(
            UUID assignmentId, String userEmail, boolean isFacultyOrHod) {
        Assignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        if (isFacultyOrHod) {
            boolean isOwner = facultyRepo.findByUserEmail(userEmail)
                    .map(f -> f.getId().equals(assignment.getFaculty().getId()))
                    .orElse(false);
            if (!isOwner) {
                throw new AccessDeniedException("Aap sirf apne assignments ki submissions dekh sakte hain.");
            }
        }

        return submissionRepo.findAllByAssignmentIdOrderBySubmittedAtDesc(assignmentId)
                .stream().map(this::toResponse).toList();
    }

    // ── Student: my submissions ──────────────────────────────────────────

    public List<SubmissionResponse> getMySubmissions(String userEmail) {
        StudentProfile student = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        return submissionRepo.findAllByStudentIdOrderBySubmittedAtDesc(student.getId())
                .stream().map(this::toResponse).toList();
    }

    // ── Grade ─────────────────────────────────────────────────────────────

    @Transactional
    public SubmissionResponse grade(UUID submissionId, GradeSubmissionRequest req, String graderEmail) {
        AssignmentSubmission submission = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        Integer maxMarks = submission.getAssignment().getMaxMarks();
        if (maxMarks != null && req.getMarksObtained() > maxMarks) {
            throw new IllegalArgumentException("Marks cannot exceed the maximum of " + maxMarks + ".");
        }

        submission.setMarksObtained(req.getMarksObtained());
        submission.setFeedback(req.getFeedback());
        submission.setStatus(SubmissionStatus.GRADED);
        submission.setGradedAt(LocalDateTime.now());

        AssignmentSubmission saved = submissionRepo.save(submission);

        notificationService.pushToUser(
                submission.getStudent().getUser(),
                "Assignment Graded",
                submission.getAssignment().getTitle() + " has been graded: "
                        + req.getMarksObtained() + (maxMarks != null ? "/" + maxMarks : "") + ".",
                NotificationType.ASSIGNMENT,
                submission.getAssignment().getId());

        return toResponse(saved);
    }

    // ── Download ──────────────────────────────────────────────────────────

    public AssignmentSubmission getSubmissionForDownload(UUID submissionId, String userEmail, boolean isAdmin) {
        AssignmentSubmission submission = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found"));

        if (isAdmin) return submission;

        boolean isOwnerStudent = studentRepo.findByUserEmail(userEmail)
                .map(s -> s.getId().equals(submission.getStudent().getId()))
                .orElse(false);
        boolean isOwnerFaculty = facultyRepo.findByUserEmail(userEmail)
                .map(f -> f.getId().equals(submission.getAssignment().getFaculty().getId()))
                .orElse(false);

        if (!isOwnerStudent && !isOwnerFaculty) {
            throw new AccessDeniedException("Aapko is file ko download karne ki permission nahi hai.");
        }
        return submission;
    }

    public Resource loadFileResource(AssignmentSubmission submission) {
        return fileStorageService.loadAsResource(STORAGE_SUBDIR, submission.getStoredFileName());
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private SubmissionResponse toResponse(AssignmentSubmission s) {
        StudentProfile student = s.getStudent();
        Assignment assignment = s.getAssignment();
        return SubmissionResponse.builder()
                .id(s.getId())
                .assignmentId(assignment.getId())
                .assignmentTitle(assignment.getTitle())
                .maxMarks(assignment.getMaxMarks())
                .studentId(student.getId())
                .studentName(student.getUser().getFirstName() + " " + student.getUser().getLastName())
                .enrollmentNumber(student.getEnrollmentNumber())
                .originalFileName(s.getOriginalFileName())
                .fileSize(s.getFileSize())
                .contentType(s.getContentType())
                .status(s.getStatus())
                .statusDisplay(s.getStatus().getDisplayName())
                .statusEmoji(s.getStatus().getEmoji())
                .late(s.getStatus() == SubmissionStatus.LATE)
                .marksObtained(s.getMarksObtained())
                .feedback(s.getFeedback())
                .gradedAt(s.getGradedAt())
                .submittedAt(s.getSubmittedAt())
                .build();
    }
}