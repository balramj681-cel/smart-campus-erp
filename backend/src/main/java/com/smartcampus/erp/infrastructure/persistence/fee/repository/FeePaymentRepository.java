package com.smartcampus.erp.infrastructure.persistence.fee.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.fee.FeePayment;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, UUID> {

    List<FeePayment> findAllByStudentFeeRecordIdOrderByPaymentDateDesc(UUID recordId);

    List<FeePayment> findAllByPaymentDateBetweenOrderByPaymentDateDesc(LocalDate from, LocalDate to);

    boolean existsByReceiptNumber(String receiptNumber);

    @Query("SELECT MAX(p.receiptNumber) FROM FeePayment p")
    String findMaxReceiptNumber();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM FeePayment p WHERE p.paymentDate BETWEEN :from AND :to")
    double sumByDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}