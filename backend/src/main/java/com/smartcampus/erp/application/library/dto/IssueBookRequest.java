package com.smartcampus.erp.application.library.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class IssueBookRequest {

    @NotNull
    private UUID bookId;

    @NotNull
    private UUID studentId;

    private Integer loanDays;
}