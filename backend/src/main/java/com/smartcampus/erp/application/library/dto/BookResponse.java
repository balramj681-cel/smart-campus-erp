package com.smartcampus.erp.application.library.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class BookResponse {
    private UUID    id;
    private String  title;
    private String  author;
    private String  isbn;
    private String  publisher;
    private String  category;
    private String  edition;
    private Integer publishedYear;
    private String  rackNumber;
    private String  description;
    private int     totalCopies;
    private int     availableCopies;
    private boolean active;
    private boolean available;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}