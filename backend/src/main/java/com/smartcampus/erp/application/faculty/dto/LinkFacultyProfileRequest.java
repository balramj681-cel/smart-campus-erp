package com.smartcampus.erp.application.faculty.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Gender;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Used to attach a {@code FacultyProfile} to a {@code User} account that
 * already exists (e.g. someone who self-registered and was later assigned
 * the FACULTY role from User Management). Deliberately excludes
 * firstName/lastName/email/password — those already live on the User row.
 */
@Getter @Setter
public class LinkFacultyProfileRequest {

    @NotBlank private String employeeId;
    private UUID             departmentId;

    @NotNull
    private Designation designation;

    private EmploymentType employmentType;

    private String qualification;
    private String specialization;
    private String researchInterests;

    @Min(0) @Max(60)
    private int experienceYears;

    private Gender     gender;
    private LocalDate  dateOfBirth;
    private LocalDate  joiningDate;
    private String     phone;
    private String     officeRoom;
}