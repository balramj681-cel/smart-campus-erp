package com.smartcampus.erp.application.leave.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class LeaveStatsResponse {
    private long pendingCount;
    private long approvedCount;
    private long rejectedCount;
}