package com.smartcampus.erp.domain.shared;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Common ancestor for every persistent entity in the Smart Campus ERP
 * system — {@code User}, {@code Student}, {@code Faculty},
 * {@code AttendanceRecord}, {@code Invoice}, {@code Book}, and every
 * entity yet to be written.
 *
 * <h2>Why BaseEntity exists</h2>
 * Every module — Auth, Student, Faculty, Attendance, Library, Finance,
 * Examination, Settings — eventually persists data, and every one of
 * those entities needs the same three things: a primary key, a creation
 * timestamp, and a last-modified timestamp. Without a shared base class,
 * that's eight-plus near-identical copies of the same id/audit
 * boilerplate, each one a separate opportunity to introduce a subtle
 * inconsistency (a mistyped column name, a forgotten audit annotation).
 * Centralizing it here means every entity gets identical, correct
 * behavior for free — and a future cross-cutting addition (a soft-delete
 * flag, an optimistic-locking {@code @Version} field, a
 * {@code createdBy}/{@code updatedBy} pair sourced from the security
 * context) is written once, in one place, and instantly available to
 * every module that extends it.
 *
 * <h2>Why UUID instead of Long</h2>
 * <ul>
 *   <li><b>No information leakage.</b> Sequential {@code Long} IDs let
 *       anyone enumerate {@code /api/students/1}, {@code /2}, {@code /3}…
 *       and infer total record counts and growth rate — a real concern for
 *       an ERP holding student and financial records. A {@code UUID}
 *       reveals nothing about how many rows exist or in what order they
 *       were created.</li>
 *   <li><b>Distributed-system friendliness.</b> A {@code Long} primary key
 *       depends on a single database sequence as the source of truth.
 *       UUIDs can be generated independently by any node — useful today for
 *       avoiding sequence contention, and essential later if any ERP module
 *       is ever split out into its own service or database.</li>
 *   <li><b>Client/offline-friendly.</b> A UUID can be generated before the
 *       entity is ever persisted, which simplifies request payloads that
 *       need to reference a not-yet-saved entity (e.g. composite
 *       create-with-children requests).</li>
 *   <li><b>Honest trade-off:</b> a {@code UUID} is 16 bytes versus 8 for a
 *       {@code Long}, and {@link GenerationType#UUID} produces randomly
 *       ordered (v4-style) values, which can fragment B-tree indexes on
 *       very high-write tables more than a sequential key would. If a
 *       specific table (e.g. {@code AttendanceRecord}, logged daily per
 *       student) ever becomes a write-throughput bottleneck, a
 *       time-ordered UUID generator is a targeted future optimization —
 *       not a reason to abandon UUIDs system-wide today.</li>
 * </ul>
 *
 * <h2>Why auditing is centralized</h2>
 * {@code @CreatedDate} and {@code @LastModifiedDate}, combined with
 * {@code @EntityListeners(AuditingEntityListener.class)}, let Spring Data
 * JPA populate these timestamps automatically on persist and update. The
 * alternative — every service manually calling
 * {@code entity.setCreatedAt(LocalDateTime.now())} — is both repetitive
 * and unreliable; it only takes one forgotten call, in one service, to
 * produce a record with a {@code null} audit trail. Centralizing it here
 * makes "every record knows when it was created and last touched" a
 * structural guarantee instead of a convention developers have to
 * remember.
 * <p><b>Dependency note:</b> these annotations only take effect once
 * {@code @EnableJpaAuditing} is registered on a {@code @Configuration}
 * class (planned as {@code config/JpaAuditingConfig.java}). Until that
 * file exists, {@code createdAt}/{@code updatedAt} will persist as
 * {@code null}.</p>
 *
 * <h2>Why every entity extends this class</h2>
 * {@code @MappedSuperclass} means {@code BaseEntity} contributes its
 * fields and mapping metadata to each subclass's own table — it does not
 * create a table of its own, and Hibernate treats
 * {@code id}/{@code createdAt}/{@code updatedAt} as if they were declared
 * directly on {@code Student}, {@code Faculty}, etc. Combined with
 * {@code @SuperBuilder} (rather than plain {@code @Builder}, which does
 * not compose correctly across a class hierarchy), every subclass inherits
 * a fluent builder for these three fields while contributing its own —
 * e.g. {@code Student.builder().rollNumber("CS21B045").build()} still has
 * working {@code .id(...)} and {@code .createdAt(...)} builder methods
 * inherited from here. This is the Open/Closed Principle in practice:
 * {@code BaseEntity} is closed for modification by individual modules, but
 * open for extension by every one of them.
 * <p><b>Encapsulation note:</b> Lombok's {@code @Setter} is generated for
 * all three fields as required, including {@code id} and the audit
 * timestamps. In practice these should be treated as read-only by
 * application code — Hibernate is the only caller that should ever set
 * them, via {@code @GeneratedValue} and the auditing listener respectively.
 * The setters exist for framework/test interoperability, not as an
 * invitation to mutate them manually.</p>
 *
 * @author Smart Campus ERP Engineering
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    /**
     * Primary key, generated by the database/Hibernate using
     * {@link GenerationType#UUID} — never assigned manually by application
     * code.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Timestamp the record was first persisted. Populated automatically by
     * {@link AuditingEntityListener}; never updated after insert.
     */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp the record was last modified. Populated automatically by
     * {@link AuditingEntityListener} on every update.
     */
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}