package com.smartcampus.erp.domain.fee;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.FeeCategory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "fee_structure_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeeStructureItem {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fee_structure_id", nullable = false)
    private FeeStructure feeStructure;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeeCategory category;

    @Column(nullable = false, precision = 12)
    private double amount;

    private LocalDate dueDate;

    @Column(length = 200)
    private String description;
}