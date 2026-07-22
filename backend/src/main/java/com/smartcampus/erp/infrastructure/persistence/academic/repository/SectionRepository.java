package com.smartcampus.erp.infrastructure.persistence.academic.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.academic.Section;

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {
    List<Section> findAllBySemesterIdOrderByNameAsc(UUID semesterId);
    boolean existsBySemesterIdAndName(UUID semesterId, String name);
}