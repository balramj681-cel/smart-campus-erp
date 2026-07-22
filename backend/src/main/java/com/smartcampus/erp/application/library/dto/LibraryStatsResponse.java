package com.smartcampus.erp.application.library.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class LibraryStatsResponse {
    private long totalBooks;
    private long totalCopies;
    private long availableCopies;
    private long activeIssues;
    private long overdueIssues;
}