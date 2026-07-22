package com.smartcampus.erp.application.fee.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter @Builder
public class FeeStructureResponse {
    private UUID   id;
    private String name;
    private int    batch;
    private String academicYear;
    private boolean active;

    private UUID   programId;
    private String programName;
    private String departmentName;

    private double totalAmount;
    private List<FeeStructureItemResponse> items;

    // Stats
    private long   totalStudents;
    private long   paidCount;
    private long   pendingCount;
    private double collectedAmount;

    private LocalDateTime createdAt;
}