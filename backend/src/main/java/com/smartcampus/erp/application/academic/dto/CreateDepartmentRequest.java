package com.smartcampus.erp.application.academic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateDepartmentRequest {

    @NotBlank @Size(max = 100)
    private String name;

    @NotBlank @Size(min = 2, max = 10)
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Code sirf letters/digits ho sakta hai")
    private String code;

    @Size(max = 500)
    private String description;
}