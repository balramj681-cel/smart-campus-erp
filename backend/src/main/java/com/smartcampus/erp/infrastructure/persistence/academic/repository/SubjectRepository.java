package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Subject;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {

    boolean existsByCode(String code);

    List<Subject> findAllBySemesterIdOrderByNameAsc(UUID semesterId);

    @Query("""
        SELECT s FROM Subject s
        WHERE (:semId IS NULL OR s.semester.id = :semId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(s.name) LIKE %:q%
               OR LOWER(s.code) LIKE %:q%)
        """)
    Page<Subject> search(
            @Param("q")     String  query,
            @Param("semId") UUID    semesterId,
            Pageable pageable);

    long countBySemesterId(UUID semesterId);
}