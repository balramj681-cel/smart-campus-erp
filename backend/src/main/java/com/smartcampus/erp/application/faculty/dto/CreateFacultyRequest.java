package com.smartcampus.erp.application.faculty.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateFacultyRequest {

    // ── Account ───────────────────────────────────────────────────────────
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 8) private String password;

    // ── Professional ──────────────────────────────────────────────────────
    @NotBlank private String employeeId;
    private UUID             departmentId;

    @NotNull
    private Designation designation;

    private EmploymentType employmentType;

    // ── Academic ──────────────────────────────────────────────────────────
    private String qualification;
    private String specialization;
    private String researchInterests;

    @Min(0) @Max(60)
    private int experienceYears;

    // ── Personal ──────────────────────────────────────────────────────────
    private Gender     gender;
    private LocalDate  dateOfBirth;
    private LocalDate  joiningDate;
    private String     phone;
    private String     officeRoom;
}