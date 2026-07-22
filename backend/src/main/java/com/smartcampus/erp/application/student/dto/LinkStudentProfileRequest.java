package com.smartcampus.erp.application.student.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.BloodGroup;
import com.smartcampus.erp.domain.shared.enums.Gender;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Same idea as LinkFacultyProfileRequest, but for students. */
@Getter @Setter
public class LinkStudentProfileRequest {

    @NotBlank private String enrollmentNumber;
    @Min(2000) @Max(2100) private int batch;
    private LocalDate admissionDate;

    private LocalDate  dateOfBirth;
    private Gender     gender;
    private BloodGroup bloodGroup;
    private String     phone;
    private String     address;

    private String guardianName;
    private String guardianContact;
}