package com.smartcampus.erp.application.library.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.BookIssueStatus;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class BookIssueResponse {
    private UUID id;

    private UUID   bookId;
    private String bookTitle;
    private String bookIsbn;

    private UUID   studentId;
    private String studentName;
    private String studentEnrollmentNumber;

    private String issuedByName;

    private LocalDate issueDate;
    private LocalDate dueDate;
    private LocalDate returnDate;

    private BookIssueStatus status;
    private String          statusDisplay;
    private String          statusEmoji;

    private BigDecimal fineAmount;
    private String     remarks;
    private boolean     overdue;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}