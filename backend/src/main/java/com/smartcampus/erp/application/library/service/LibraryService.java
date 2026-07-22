package com.smartcampus.erp.application.library.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcampus.erp.application.library.dto.BookIssueResponse;
import com.smartcampus.erp.application.library.dto.BookResponse;
import com.smartcampus.erp.application.library.dto.CreateBookRequest;
import com.smartcampus.erp.application.library.dto.IssueBookRequest;
import com.smartcampus.erp.application.library.dto.LibraryStatsResponse;
import com.smartcampus.erp.application.library.dto.UpdateBookRequest;
import com.smartcampus.erp.application.notification.service.NotificationService;
import com.smartcampus.erp.domain.academic.StudentProfile;
import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.library.Book;
import com.smartcampus.erp.domain.library.BookIssueRecord;
import com.smartcampus.erp.domain.shared.enums.BookIssueStatus;
import com.smartcampus.erp.domain.shared.enums.NotificationType;
import com.smartcampus.erp.infrastructure.persistence.academic.repository.StudentProfileRepository;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;
import com.smartcampus.erp.infrastructure.persistence.library.repository.BookIssueRecordRepository;
import com.smartcampus.erp.infrastructure.persistence.library.repository.BookRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LibraryService {

    // Default loan window applied when a request doesn't specify one.
    private static final int DEFAULT_LOAN_DAYS = 14;

    // Flat per-day late fine, applied once a book is returned/evaluated
    // past its due date.
    private static final BigDecimal FINE_PER_DAY = new BigDecimal("2.00");

    private final BookRepository             bookRepo;
    private final BookIssueRecordRepository  issueRepo;
    private final StudentProfileRepository   studentRepo;
    private final UserRepository             userRepo;
    private final NotificationService        notificationService;

    // ── Books: catalogue ────────────────────────────────────────────────

    public Page<BookResponse> getBooks(String search, String category, Boolean active,
                                        int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return bookRepo.search(q, category, active, pageable).map(this::toBookResponse);
    }

    public BookResponse getBookById(UUID id) {
        return toBookResponse(findBookOrThrow(id));
    }

    @Transactional
    public BookResponse createBook(CreateBookRequest req) {
        if (bookRepo.existsByIsbn(req.getIsbn())) {
            throw new IllegalArgumentException("A book with this ISBN already exists.");
        }

        Book book = Book.builder()
                .title(req.getTitle())
                .author(req.getAuthor())
                .isbn(req.getIsbn())
                .publisher(req.getPublisher())
                .category(req.getCategory())
                .edition(req.getEdition())
                .publishedYear(req.getPublishedYear())
                .rackNumber(req.getRackNumber())
                .description(req.getDescription())
                .totalCopies(req.getTotalCopies())
                .availableCopies(req.getTotalCopies())
                .build();

        return toBookResponse(bookRepo.save(book));
    }

    @Transactional
    public BookResponse updateBook(UUID id, UpdateBookRequest req) {
        Book book = findBookOrThrow(id);

        if (!book.getIsbn().equalsIgnoreCase(req.getIsbn())
                && bookRepo.existsByIsbn(req.getIsbn())) {
            throw new IllegalArgumentException("A book with this ISBN already exists.");
        }

        long issuedCopies = issueRepo.countByBookIdAndStatus(id, BookIssueStatus.ISSUED);
        if (req.getTotalCopies() < issuedCopies) {
            throw new IllegalArgumentException(
                "Total copies cannot be less than the " + issuedCopies + " currently issued.");
        }

        // Re-derive availableCopies against the (possibly changed) total,
        // keeping the number of copies out on loan constant.
        int newAvailable = (int) (req.getTotalCopies() - issuedCopies);

        book.setTitle(req.getTitle());
        book.setAuthor(req.getAuthor());
        book.setIsbn(req.getIsbn());
        book.setPublisher(req.getPublisher());
        book.setCategory(req.getCategory());
        book.setEdition(req.getEdition());
        book.setPublishedYear(req.getPublishedYear());
        book.setRackNumber(req.getRackNumber());
        book.setDescription(req.getDescription());
        book.setTotalCopies(req.getTotalCopies());
        book.setAvailableCopies(newAvailable);
        book.setActive(req.isActive());

        return toBookResponse(bookRepo.save(book));
    }

    @Transactional
    public void deleteBook(UUID id) {
        Book book = findBookOrThrow(id);
        long issuedCopies = issueRepo.countByBookIdAndStatus(id, BookIssueStatus.ISSUED);
        if (issuedCopies > 0) {
            throw new IllegalArgumentException(
                "Cannot delete: " + issuedCopies + " cop" + (issuedCopies == 1 ? "y" : "ies")
                    + " of this book are currently issued.");
        }
        bookRepo.delete(book);
    }

    @Transactional
    public BookResponse toggleActive(UUID id) {
        Book book = findBookOrThrow(id);
        book.setActive(!book.isActive());
        return toBookResponse(bookRepo.save(book));
    }

    // ── Issue / Return workflow ─────────────────────────────────────────

    @Transactional
    public BookIssueResponse issueBook(IssueBookRequest req, String librarianEmail) {
        Book book = findBookOrThrow(req.getBookId());
        StudentProfile student = studentRepo.findById(req.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        User librarian = userRepo.findByEmail(librarianEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!book.isAvailable()) {
            throw new IllegalArgumentException("No available copies of this book right now.");
        }
        if (issueRepo.existsByBookIdAndStudentIdAndStatus(
                book.getId(), student.getId(), BookIssueStatus.ISSUED)) {
            throw new IllegalArgumentException("This student already has an active copy of this book.");
        }

        int loanDays = (req.getLoanDays() != null && req.getLoanDays() > 0)
                ? req.getLoanDays() : DEFAULT_LOAN_DAYS;

        LocalDate today = LocalDate.now();
        BookIssueRecord record = issueRepo.save(BookIssueRecord.builder()
                .book(book)
                .student(student)
                .issuedBy(librarian)
                .issueDate(today)
                .dueDate(today.plusDays(loanDays))
                .status(BookIssueStatus.ISSUED)
                .build());

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepo.save(book);

        notificationService.pushToUser(
                student.getUser(),
                "Book Issued",
                book.getTitle() + " has been issued to you. Due back on " + record.getDueDate() + ".",
                NotificationType.LIBRARY,
                record.getId());

        return toIssueResponse(record);
    }

    @Transactional
    public BookIssueResponse returnBook(UUID issueId) {
        BookIssueRecord record = issueRepo.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue record not found"));

        if (record.getStatus() != BookIssueStatus.ISSUED) {
            throw new IllegalArgumentException("This copy has already been " + record.getStatus().getDisplayName().toLowerCase() + ".");
        }

        LocalDate today = LocalDate.now();
        record.setReturnDate(today);
        record.setStatus(BookIssueStatus.RETURNED);

        if (today.isAfter(record.getDueDate())) {
            long lateDays = ChronoUnit.DAYS.between(record.getDueDate(), today);
            record.setFineAmount(FINE_PER_DAY.multiply(BigDecimal.valueOf(lateDays)));
        }

        Book book = record.getBook();
        book.setAvailableCopies(Math.min(book.getTotalCopies(), book.getAvailableCopies() + 1));
        bookRepo.save(book);

        return toIssueResponse(issueRepo.save(record));
    }

    @Transactional
    public BookIssueResponse markLost(UUID issueId, String remarks) {
        BookIssueRecord record = issueRepo.findById(issueId)
                .orElseThrow(() -> new IllegalArgumentException("Issue record not found"));

        if (record.getStatus() != BookIssueStatus.ISSUED) {
            throw new IllegalArgumentException("Only an actively issued copy can be marked lost.");
        }

        record.setStatus(BookIssueStatus.LOST);
        record.setRemarks(remarks);
        // Lost copies permanently reduce the title's total stock — they
        // don't return to the shelf, so totalCopies drops along with them.
        Book book = record.getBook();
        book.setTotalCopies(Math.max(0, book.getTotalCopies() - 1));
        bookRepo.save(book);

        return toIssueResponse(issueRepo.save(record));
    }

    // ── Issue records: listing ──────────────────────────────────────────

    public Page<BookIssueResponse> getIssues(String search, BookIssueStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        String q = (search != null && !search.isBlank()) ? search.toLowerCase() : "";
        return issueRepo.search(q, status, pageable).map(this::toIssueResponse);
    }

    public Page<BookIssueResponse> getMyIssues(String userEmail, int page, int size) {
        StudentProfile student = studentRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        Pageable pageable = PageRequest.of(page, size);
        return issueRepo.findAllByStudentIdOrderByIssueDateDesc(student.getId(), pageable)
                .map(this::toIssueResponse);
    }

    // ── Stats ────────────────────────────────────────────────────────────

    public LibraryStatsResponse getStats() {
        long totalBooks       = bookRepo.count();
        long totalCopies      = bookRepo.findAll().stream().mapToLong(Book::getTotalCopies).sum();
        long availableCopies  = bookRepo.findAll().stream().mapToLong(Book::getAvailableCopies).sum();
        long activeIssues     = issueRepo.countByStatus(BookIssueStatus.ISSUED);
        long overdueIssues    = issueRepo.findAllByStatus(BookIssueStatus.ISSUED)
                .stream().filter(BookIssueRecord::isCurrentlyOverdue).count();

        return LibraryStatsResponse.builder()
                .totalBooks(totalBooks)
                .totalCopies(totalCopies)
                .availableCopies(availableCopies)
                .activeIssues(activeIssues)
                .overdueIssues(overdueIssues)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Book findBookOrThrow(UUID id) {
        return bookRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Book not found: " + id));
    }

    private BookResponse toBookResponse(Book b) {
        return BookResponse.builder()
                .id(b.getId())
                .title(b.getTitle())
                .author(b.getAuthor())
                .isbn(b.getIsbn())
                .publisher(b.getPublisher())
                .category(b.getCategory())
                .edition(b.getEdition())
                .publishedYear(b.getPublishedYear())
                .rackNumber(b.getRackNumber())
                .description(b.getDescription())
                .totalCopies(b.getTotalCopies())
                .availableCopies(b.getAvailableCopies())
                .active(b.isActive())
                .available(b.isAvailable())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    private BookIssueResponse toIssueResponse(BookIssueRecord r) {
        User studentUser = r.getStudent().getUser();
        return BookIssueResponse.builder()
                .id(r.getId())
                .bookId(r.getBook().getId())
                .bookTitle(r.getBook().getTitle())
                .bookIsbn(r.getBook().getIsbn())
                .studentId(r.getStudent().getId())
                .studentName(studentUser.getFullName())
                .studentEnrollmentNumber(r.getStudent().getEnrollmentNumber())
                .issuedByName(r.getIssuedBy().getFullName())
                .issueDate(r.getIssueDate())
                .dueDate(r.getDueDate())
                .returnDate(r.getReturnDate())
                .status(r.getStatus())
                .statusDisplay(r.getStatus().getDisplayName())
                .statusEmoji(r.getStatus().getEmoji())
                .fineAmount(r.getFineAmount())
                .remarks(r.getRemarks())
                .overdue(r.isCurrentlyOverdue())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}