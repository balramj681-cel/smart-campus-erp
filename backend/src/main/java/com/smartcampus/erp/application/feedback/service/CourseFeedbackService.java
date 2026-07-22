package com.smartcampus.erp.application.feedback.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.feedback.dto.CreateFeedbackRequest;
import com.smartcampus.erp.application.feedback.dto.FeedbackResponse;
import com.smartcampus.erp.application.feedback.dto.FeedbackSummaryResponse;
import com.smartcampus.erp.application.feedback.dto.PendingFeedbackResponse;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.academic.FacultySubjectAssignment;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.feedback.CourseFeedback;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultySubjectAssignmentRepository;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.feedback.repository.CourseFeedbackRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourseFeedbackService {

    private final CourseFeedbackRepository            feedbackRepo;
    private final StudentProfileRepository            studentRepo;
    private final FacultyProfileRepository            facultyRepo;
    private final FacultySubjectAssignmentRepository  assignmentRepo;

    // ── Student: pending — jo subjects abhi tak rate nahi kiye ──────────────

    public List<PendingFeedbackResponse> getPending(String userEmail, String academicYear) {
        StudentProfile student = findStudentOrThrow(userEmail);
        if (student.getCurrentSection() == null) return List.of();

        String year = (academicYear != null && !academicYear.isBlank())
                ? academicYear : currentAcademicYear();

        List<FacultySubjectAssignment> assignments = assignmentRepo
                .search(year, null, student.getCurrentSection().getId(), null, Pageable.unpaged())
                .getContent();

        return assignments.stream()
                .filter(FacultySubjectAssignment::isActive)
                .filter(a -> !feedbackRepo.existsByStudentIdAndAssignmentId(student.getId(), a.getId()))
                .map(a -> PendingFeedbackResponse.builder()
                        .assignmentId(a.getId())
                        .subjectCode(a.getSubject().getCode())
                        .subjectName(a.getSubject().getName())
                        .facultyName(a.getFaculty().getUser().getFirstName() + " " + a.getFaculty().getUser().getLastName())
                        .sectionName(a.getSection().getName())
                        .academicYear(a.getAcademicYear())
                        .build())
                .collect(Collectors.toList());
    }

    // ── Student: apni submit ki hui feedback ────────────────────────────────

    public List<FeedbackResponse> getMySubmitted(String userEmail) {
        StudentProfile student = findStudentOrThrow(userEmail);
        return feedbackRepo.findAllByStudentId(student.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Create ────────────────────────────────────────────────────────────

    @Transactional
    public FeedbackResponse submit(CreateFeedbackRequest req, String userEmail) {
        StudentProfile student = findStudentOrThrow(userEmail);

        FacultySubjectAssignment assignment = assignmentRepo.findById(req.getAssignmentId())
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        if (feedbackRepo.existsByStudentIdAndAssignmentId(student.getId(), assignment.getId())) {
            throw new IllegalArgumentException("You have already rated this subject.");
        }

        double avg = (req.getTeachingQuality() + req.getSyllabusCoverage()
                + req.getCommunicationSkills() + req.getPunctuality()) / 4.0;

        CourseFeedback saved = feedbackRepo.save(CourseFeedback.builder()
                .assignment(assignment)
                .student(student)
                .teachingQuality(req.getTeachingQuality())
                .syllabusCoverage(req.getSyllabusCoverage())
                .communicationSkills(req.getCommunicationSkills())
                .punctuality(req.getPunctuality())
                .overallRating(Math.round(avg * 10) / 10.0)
                .comments(req.getComments())
                .build());

        return toResponse(saved);
    }

    // ── Faculty: apni assignments ka summary ────────────────────────────────

    public List<FeedbackSummaryResponse> getMySummary(String userEmail) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found"));

        List<FacultySubjectAssignment> assignments =
                assignmentRepo.findAllByFacultyIdAndAcademicYear(faculty.getId(), currentAcademicYear());

        return assignments.stream()
                .map(a -> {
                    Double avg = feedbackRepo.averageForAssignment(a.getId());
                    long count = feedbackRepo.countForAssignment(a.getId());
                    return FeedbackSummaryResponse.builder()
                            .assignmentId(a.getId())
                            .subjectCode(a.getSubject().getCode())
                            .subjectName(a.getSubject().getName())
                            .sectionName(a.getSection().getName())
                            .facultyName(faculty.getUser().getFirstName() + " " + faculty.getUser().getLastName())
                            .averageRating(avg != null ? Math.round(avg * 10) / 10.0 : 0.0)
                            .totalResponses(count)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // Anonymous — sirf ratings + comments, student identity kabhi return nahi hoti
    public List<FeedbackResponse> getFeedbackForAssignment(UUID assignmentId) {
        return feedbackRepo.findAllByAssignmentId(assignmentId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Admin: har faculty ka overall average (sabse achhe pehle) ───────────

    public List<FeedbackSummaryResponse> getAdminOverview() {
        return feedbackRepo.findDistinctRatedFacultyIds().stream()
                .map(facultyId -> {
                    FacultyProfile faculty = facultyRepo.findById(facultyId).orElse(null);
                    if (faculty == null) return null;
                    Double avg = feedbackRepo.averageForFaculty(facultyId);
                    long count = feedbackRepo.findAllByFacultyId(facultyId).size();
                    return FeedbackSummaryResponse.builder()
                            .facultyName(faculty.getUser().getFirstName() + " " + faculty.getUser().getLastName())
                            .averageRating(avg != null ? Math.round(avg * 10) / 10.0 : 0.0)
                            .totalResponses(count)
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .sorted((a, b) -> Double.compare(b.getAverageRating(), a.getAverageRating()))
                .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private StudentProfile findStudentOrThrow(String email) {
        return studentRepo.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
    }

    private String currentAcademicYear() {
        int y = java.time.Year.now().getValue();
        return y + "-" + String.valueOf((y + 1) % 100);
    }

    private FeedbackResponse toResponse(CourseFeedback f) {
        FacultySubjectAssignment a = f.getAssignment();
        return FeedbackResponse.builder()
                .id(f.getId())
                .assignmentId(a.getId())
                .subjectName(a.getSubject().getName())
                .subjectCode(a.getSubject().getCode())
                .sectionName(a.getSection().getName())
                .teachingQuality(f.getTeachingQuality())
                .syllabusCoverage(f.getSyllabusCoverage())
                .communicationSkills(f.getCommunicationSkills())
                .punctuality(f.getPunctuality())
                .overallRating(f.getOverallRating())
                .comments(f.getComments())
                .createdAt(f.getCreatedAt())
                .build();
    }
}