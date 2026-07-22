package com.smartcampus.erp.infrastructure.persistence.fee.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.fee.StudentFeeRecord;
import com.smartcampus.erp.domain.shared.enums.FeeStatus;

@Repository
public interface StudentFeeRecordRepository extends JpaRepository<StudentFeeRecord, UUID> {

    Optional<StudentFeeRecord> findByStudentIdAndFeeStructureId(UUID studentId, UUID structureId);

    List<StudentFeeRecord> findAllByFeeStructureId(UUID structureId);

    List<StudentFeeRecord> findAllByStudentId(UUID studentId);

    @Query("""
        SELECT r FROM StudentFeeRecord r
        WHERE (:structureId IS NULL OR r.feeStructure.id = :structureId)
          AND (:status IS NULL OR r.status = :status)
          AND (:q IS NULL OR :q = ''
               OR LOWER(r.student.user.firstName) LIKE %:q%
               OR LOWER(r.student.user.lastName) LIKE %:q%
               OR LOWER(r.student.enrollmentNumber) LIKE %:q%)
        """)
    Page<StudentFeeRecord> search(
            @Param("structureId") UUID structureId,
            @Param("status") FeeStatus status,
            @Param("q") String query,
            Pageable pageable);

    long countByFeeStructureIdAndStatus(UUID structureId, FeeStatus status);

    @Query("""
        SELECT COALESCE(SUM(r.totalAmount), 0)
        FROM StudentFeeRecord r
        WHERE r.feeStructure.id = :id
        """)
    Double sumTotalByStructure(@Param("id") UUID structureId);

    @Query("""
        SELECT COALESCE(SUM(r.paidAmount), 0)
        FROM StudentFeeRecord r
        WHERE (:id IS NULL OR r.feeStructure.id = :id)
        """)
    Double sumPaidByStructure(@Param("id") UUID structureId);

    @Query("""
        SELECT COALESCE(SUM(r.totalAmount - r.paidAmount), 0)
        FROM StudentFeeRecord r
        """)
    Double sumDueAll();

    long countByStatus(FeeStatus status);
}