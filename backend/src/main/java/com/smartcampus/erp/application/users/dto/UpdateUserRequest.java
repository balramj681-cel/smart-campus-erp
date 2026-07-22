package com.smartcampus.erp.application.users.dto;

import com.smartcampus.erp.domain.shared.enums.Role;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private Role   role;
}