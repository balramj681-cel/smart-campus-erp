package com.smartcampus.erp.presentation.notice;

import java.util.List;
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

import com.smartcampus.erp.application.notice.dto.CreateNoticeRequest;
import com.smartcampus.erp.application.notice.dto.NoticeResponse;
import com.smartcampus.erp.application.notice.service.NoticeService;
import com.smartcampus.erp.domain.shared.enums.NoticeCategory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public ResponseEntity<Page<NoticeResponse>> list(
            Authentication auth,
            @RequestParam(required = false) NoticeCategory category,
            @RequestParam(required = false) String         search,
            @RequestParam(defaultValue = "0")  int        page,
            @RequestParam(defaultValue = "10") int        size
    ) {
        return ResponseEntity.ok(noticeService.getNotices(auth, category, search, page, size));
    }

    @GetMapping("/pinned")
    public ResponseEntity<List<NoticeResponse>> getPinned() {
        return ResponseEntity.ok(noticeService.getPinned());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoticeResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(noticeService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<NoticeResponse> create(
            @Valid @RequestBody CreateNoticeRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(noticeService.create(req, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','HOD','FACULTY')")
    public ResponseEntity<NoticeResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateNoticeRequest req) {
        return ResponseEntity.ok(noticeService.update(id, req));
    }

    @PatchMapping("/{id}/toggle-pin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<NoticeResponse> togglePin(@PathVariable UUID id) {
        return ResponseEntity.ok(noticeService.togglePin(id));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<NoticeResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(noticeService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        noticeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}