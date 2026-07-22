package com.smartcampus.erp.domain.library;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "books")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Book {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(nullable = false, length = 200)
    private String author;

    @Column(nullable = false, unique = true, length = 30)
    private String isbn;

    @Column(length = 150)
    private String publisher;

    @Column(length = 100)
    private String category;

    @Column(length = 30)
    private String edition;

    private Integer publishedYear;

    @Column(length = 50)
    private String rackNumber;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int totalCopies;

    @Column(nullable = false)
    private int availableCopies;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate  @Column(updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate                        private LocalDateTime updatedAt;

    public boolean isAvailable() {
        return active && availableCopies > 0;
    }
}