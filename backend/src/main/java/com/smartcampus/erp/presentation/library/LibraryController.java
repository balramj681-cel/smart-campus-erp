package com.smartcampus.erp.presentation.library;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcampus.erp.application.library.dto.BookIssueResponse;
import com.smartcampus.erp.application.library.dto.BookResponse;
import com.smartcampus.erp.application.library.dto.CreateBookRequest;
import com.smartcampus.erp.application.library.dto.IssueBookRequest;
import com.smartcampus.erp.application.library.dto.LibraryStatsResponse;
import com.smartcampus.erp.application.library.dto.UpdateBookRequest;
import com.smartcampus.erp.application.library.service.LibraryService;
import com.smartcampus.erp.domain.shared.enums.BookIssueStatus;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    @GetMapping("/books")
    public ResponseEntity<Page<BookResponse>> getBooks(
            @RequestParam(required = false) String  search,
            @RequestParam(required = false) String  category,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0")  int   page,
            @RequestParam(defaultValue = "10") int   size) {
        return ResponseEntity.ok(libraryService.getBooks(search, category, active, page, size));
    }

    @GetMapping("/books/{id}")
    public ResponseEntity<BookResponse> getBookById(@PathVariable UUID id) {
        return ResponseEntity.ok(libraryService.getBookById(id));
    }

    @PostMapping("/books")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookResponse> createBook(@Valid @RequestBody CreateBookRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(libraryService.createBook(req));
    }

    @PutMapping("/books/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable UUID id, @Valid @RequestBody UpdateBookRequest req) {
        return ResponseEntity.ok(libraryService.updateBook(id, req));
    }

    @PatchMapping("/books/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(libraryService.toggleActive(id));
    }

    @DeleteMapping("/books/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<Void> deleteBook(@PathVariable UUID id) {
        libraryService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/issues")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookIssueResponse> issueBook(
            @Valid @RequestBody IssueBookRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(libraryService.issueBook(req, auth.getName()));
    }

    @PatchMapping("/issues/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookIssueResponse> returnBook(@PathVariable UUID id) {
        return ResponseEntity.ok(libraryService.returnBook(id));
    }

    @PatchMapping("/issues/{id}/mark-lost")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<BookIssueResponse> markLost(
            @PathVariable UUID id, @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(libraryService.markLost(id, remarks));
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<Page<BookIssueResponse>> getIssues(
            @RequestParam(required = false) String          search,
            @RequestParam(required = false) BookIssueStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(libraryService.getIssues(search, status, page, size));
    }

    @GetMapping("/my-issues")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<BookIssueResponse>> getMyIssues(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(libraryService.getMyIssues(auth.getName(), page, size));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','LIBRARIAN')")
    public ResponseEntity<LibraryStatsResponse> getStats() {
        return ResponseEntity.ok(libraryService.getStats());
    }
}