package com.smartcampus.erp.application.grievance.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.GrievanceCategory;
import com.smartcampus.erp.domain.shared.enums.GrievancePriority;
import com.smartcampus.erp.domain.shared.enums.GrievanceStatus;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class GrievanceResponse {
    private UUID id;
    private String title;
    private String description;

    private GrievanceCategory category;
    private String categoryDisplay;
    private String categoryEmoji;

    private GrievancePriority priority;
    private String priorityDisplay;
    private String priorityEmoji;

    private GrievanceStatus status;
    private String statusDisplay;
    private String statusEmoji;

    private UUID   raisedById;
    private String raisedByName;   // "Anonymous" if anonymous flag set (for non-admin viewers)
    private String raisedByRole;
    private boolean anonymous;

    private UUID   assignedToId;
    private String assignedToName;

    private String resolutionRemarks;
    private LocalDateTime resolvedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}