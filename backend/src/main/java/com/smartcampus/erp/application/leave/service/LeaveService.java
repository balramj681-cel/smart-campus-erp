package com.smartcampus.erp.application.leave.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.leave.dto.ApplyLeaveRequest;
import com.smartcampus.erp.application.leave.dto.LeaveRequestResponse;
import com.smartcampus.erp.application.leave.dto.LeaveStatsResponse;
import com.smartcampus.erp.application.leave.dto.ReviewLeaveRequest;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.FacultyProfile;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.leave.LeaveRequest;
import com.smartcampus.erp.domain.shared.enums.LeaveStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.FacultyProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.leave.repository.LeaveRequestRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository   leaveRepo;
    private final FacultyProfileRepository facultyRepo;
    private final UserRepository           userRepo;
    private final NotificationService      notificationService;

    // ── Apply ────────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequestResponse apply(ApplyLeaveRequest req, String userEmail) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));

        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before the start date.");
        }
        if (leaveRepo.hasOverlappingLeave(faculty.getId(), req.getStartDate(), req.getEndDate())) {
            throw new IllegalArgumentException(
                "You already have a pending or approved leave that overlaps these dates.");
        }

        LeaveRequest leave = leaveRepo.save(LeaveRequest.builder()
                .faculty(faculty)
                .leaveType(req.getLeaveType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .status(LeaveStatus.PENDING)
                .build());

        notifyAdminsOfNewLeave(leave);

        return toResponse(leave);
    }

    // ── Faculty: my leaves ───────────────────────────────────────────────

    public Page<LeaveRequestResponse> getMyLeaves(String userEmail, int page, int size) {
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found for: " + userEmail));
        Pageable pageable = PageRequest.of(page, size);
        return leaveRepo.findAllByFacultyIdOrderByAppliedAtDesc(faculty.getId(), pageable)
                .map(this::toResponse);
    }

    @Transactional
    public void cancel(UUID id, String userEmail) {
        LeaveRequest leave = findOrThrow(id);
        FacultyProfile faculty = facultyRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Faculty profile not found"));

        if (!leave.getFaculty().getId().equals(faculty.getId())) {
            throw new IllegalArgumentException("You can only cancel your own leave requests.");
        }
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalArgumentException("Only a pending leave request can be cancelled.");
        }

        leave.setStatus(LeaveStatus.CANCELLED);
        leaveRepo.save(leave);
    }

    // ── Admin: review ────────────────────────────────────────────────────

    public Page<LeaveRequestResponse> getAll(LeaveStatus status, UUID facultyId, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return leaveRepo.search(q, status, facultyId, pageable).map(this::toResponse);
    }

    @Transactional
    public LeaveRequestResponse review(UUID id, ReviewLeaveRequest req, String reviewerEmail) {
        if (req.getStatus() != LeaveStatus.APPROVED && req.getStatus() != LeaveStatus.REJECTED) {
            throw new IllegalArgumentException("Review status must be either APPROVED or REJECTED.");
        }

        LeaveRequest leave = findOrThrow(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalArgumentException("This leave request has already been " + leave.getStatus().getDisplayName().toLowerCase() + ".");
        }

        User reviewer = userRepo.findByEmail(reviewerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        leave.setStatus(req.getStatus());
        leave.setReviewedBy(reviewer);
        leave.setReviewRemarks(req.getRemarks());
        leave.setReviewedAt(LocalDateTime.now());

        LeaveRequest saved = leaveRepo.save(leave);

        notificationService.pushToUser(
                leave.getFaculty().getUser(),
                "Leave " + req.getStatus().getDisplayName(),
                "Your " + leave.getLeaveType().getDisplayName().toLowerCase() + " request ("
                        + leave.getStartDate() + " to " + leave.getEndDate() + ") was "
                        + req.getStatus().getDisplayName().toLowerCase() + ".",
                NotificationType.GENERAL,
                leave.getId());

        return toResponse(saved);
    }

    // ── Stats ────────────────────────────────────────────────────────────

    public LeaveStatsResponse getStats() {
        return LeaveStatsResponse.builder()
                .pendingCount(leaveRepo.countByStatus(LeaveStatus.PENDING))
                .approvedCount(leaveRepo.countByStatus(LeaveStatus.APPROVED))
                .rejectedCount(leaveRepo.countByStatus(LeaveStatus.REJECTED))
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void notifyAdminsOfNewLeave(LeaveRequest leave) {
        List<User> admins = userRepo.findAllByRole(Role.ADMIN);
        List<User> superAdmins = userRepo.findAllByRole(Role.SUPER_ADMIN);

        String facultyName = leave.getFaculty().getUser().getFirstName() + " " + leave.getFaculty().getUser().getLastName();
        String message = facultyName + " applied for " + leave.getLeaveType().getDisplayName().toLowerCase()
                + " (" + leave.getStartDate() + " to " + leave.getEndDate() + ").";

        for (User admin : admins) {
            notificationService.pushToUser(admin, "New Leave Request", message, NotificationType.GENERAL, leave.getId());
        }
        for (User admin : superAdmins) {
            notificationService.pushToUser(admin, "New Leave Request", message, NotificationType.GENERAL, leave.getId());
        }
    }

    private LeaveRequest findOrThrow(UUID id) {
        return leaveRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found: " + id));
    }

    private LeaveRequestResponse toResponse(LeaveRequest l) {
        FacultyProfile faculty = l.getFaculty();
        return LeaveRequestResponse.builder()
                .id(l.getId())
                .facultyId(faculty.getId())
                .facultyName(faculty.getUser().getFirstName() + " " + faculty.getUser().getLastName())
                .employeeId(faculty.getEmployeeId())
                .departmentName(faculty.getDepartment() != null ? faculty.getDepartment().getName() : null)
                .leaveType(l.getLeaveType())
                .leaveTypeDisplay(l.getLeaveType().getDisplayName())
                .leaveTypeEmoji(l.getLeaveType().getEmoji())
                .startDate(l.getStartDate())
                .endDate(l.getEndDate())
                .durationDays(l.getDurationDays())
                .reason(l.getReason())
                .status(l.getStatus())
                .statusDisplay(l.getStatus().getDisplayName())
                .statusEmoji(l.getStatus().getEmoji())
                .reviewedByName(l.getReviewedBy() != null
                        ? l.getReviewedBy().getFirstName() + " " + l.getReviewedBy().getLastName() : null)
                .reviewRemarks(l.getReviewRemarks())
                .reviewedAt(l.getReviewedAt())
                .appliedAt(l.getAppliedAt())
                .build();
    }
}