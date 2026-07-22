package com.smartcampus.erp.application.academic.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class DepartmentResponse {
    private UUID          id;
    private String        name;
    private String        code;
    private String        description;
    private boolean       active;
    private int           programCount;
    private LocalDateTime createdAt;
}