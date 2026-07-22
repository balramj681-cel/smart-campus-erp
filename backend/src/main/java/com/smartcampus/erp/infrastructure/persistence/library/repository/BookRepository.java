package com.smartcampus.erp.infrastructure.persistence.library.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.library.Book;

@Repository
public interface BookRepository extends JpaRepository<Book, UUID> {

    boolean existsByIsbn(String isbn);

    @Query("""
        SELECT b FROM Book b
        WHERE (:active IS NULL OR b.active = :active)
          AND (:category IS NULL OR :category = '' OR b.category = :category)
          AND (:q IS NULL OR :q = ''
               OR LOWER(b.title)  LIKE %:q%
               OR LOWER(b.author) LIKE %:q%
               OR LOWER(b.isbn)   LIKE %:q%)
        ORDER BY b.createdAt DESC
        """)
    Page<Book> search(
            @Param("q")        String  query,
            @Param("category") String  category,
            @Param("active")   Boolean active,
            Pageable pageable);

    long countByActive(boolean active);
}