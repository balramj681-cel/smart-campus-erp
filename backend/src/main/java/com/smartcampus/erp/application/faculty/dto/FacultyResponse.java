package com.smartcampus.erp.application.faculty.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Gender;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class FacultyResponse {

    // Identity
    private UUID   id;
    private UUID   userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private boolean userEnabled;

    // Professional
    private String         employeeId;
    private UUID           departmentId;
    private String         departmentName;
    private Designation    designation;
    private EmploymentType employmentType;

    // Academic
    private String qualification;
    private String specialization;
    private String researchInterests;
    private int    experienceYears;

    // Personal
    private Gender     gender;
    private LocalDate  dateOfBirth;
    private LocalDate  joiningDate;
    private String     officeRoom;
    private boolean    active;

    private LocalDateTime createdAt;
}