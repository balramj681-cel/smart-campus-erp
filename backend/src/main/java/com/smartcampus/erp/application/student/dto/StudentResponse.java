package com.smartcampus.erp.application.student.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.BloodGroup;
import com.smartcampus.erp.domain.shared.enums.Gender;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class StudentResponse {

    // Identity
    private UUID   id;               // StudentProfile id
    private UUID   userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private boolean userEnabled;

    // Academic
    private String    enrollmentNumber;
    private int       batch;
    private LocalDate admissionDate;

    // Personal
    private LocalDate  dateOfBirth;
    private Gender     gender;
    private BloodGroup bloodGroup;
    private String     address;

    // Guardian
    private String guardianName;
    private String guardianContact;

    // Current placement
    private UUID   currentSectionId;
    private String currentSectionName;
    private String currentSemesterName;
    private String currentProgramName;
    private String currentDepartmentName;

    private LocalDateTime createdAt;
}