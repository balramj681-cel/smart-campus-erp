package com.smartcampus.erp.presentation.users;

import com.smartcampus.erp.application.users.dto.CreateUserRequest;
import com.smartcampus.erp.application.users.dto.UpdateUserRequest;
import com.smartcampus.erp.application.users.dto.UserResponse;
import com.smartcampus.erp.application.users.service.UserService;
import com.smartcampus.erp.domain.shared.enums.Role;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserResponse>> list(
            @RequestParam(defaultValue = "0")  int     page,
            @RequestParam(defaultValue = "10") int     size,
            @RequestParam(required = false)    String  search,
            @RequestParam(required = false)    Role    role,
            @RequestParam(required = false)    Boolean active
    ) {
        return ResponseEntity.ok(userService.getAllUsers(page, size, search, role, active));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest req
    ) {
        return ResponseEntity.ok(userService.updateUser(id, req));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<UserResponse> toggleStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}