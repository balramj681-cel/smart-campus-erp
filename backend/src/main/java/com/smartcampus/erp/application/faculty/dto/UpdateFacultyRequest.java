package com.smartcampus.erp.application.faculty.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.Designation;
import com.smartcampus.erp.domain.shared.enums.EmploymentType;
import com.smartcampus.erp.domain.shared.enums.Gender;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateFacultyRequest {
    private String         firstName;
    private String         lastName;
    private String         phone;
    private UUID           departmentId;
    private Designation    designation;
    private EmploymentType employmentType;
    private String         qualification;
    private String         specialization;
    private String         researchInterests;
    private Integer        experienceYears;
    private Gender         gender;
    private LocalDate      dateOfBirth;
    private LocalDate      joiningDate;
    private String         officeRoom;
}