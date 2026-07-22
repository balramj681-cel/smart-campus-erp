package com.smartcampus.erp.application.student.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.BloodGroup;
import com.smartcampus.erp.domain.shared.enums.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateStudentRequest {

    // ── Account ────────────────────────────────────────────────────────────
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 8) private String password;

    // ── Academic ───────────────────────────────────────────────────────────
    @NotBlank private String enrollmentNumber;
    @Min(2000) @Max(2100) private int batch;
    private LocalDate admissionDate;

    // ── Personal ───────────────────────────────────────────────────────────
    private LocalDate  dateOfBirth;
    private Gender     gender;
    private BloodGroup bloodGroup;
    private String     phone;
    private String     address;

    // ── Guardian ───────────────────────────────────────────────────────────
    private String guardianName;
    private String guardianContact;
}