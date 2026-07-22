package com.smartcampus.erp.application.student.dto;

import java.time.LocalDate;

import com.smartcampus.erp.domain.shared.enums.BloodGroup;
import com.smartcampus.erp.domain.shared.enums.Gender;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateStudentRequest {
    private String     firstName;
    private String     lastName;
    private String     phone;
    private LocalDate  dateOfBirth;
    private Gender     gender;
    private BloodGroup bloodGroup;
    private String     address;
    private String     guardianName;
    private String     guardianContact;
    private LocalDate  admissionDate;
}