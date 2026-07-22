package com.smartcampus.erp.config;

import com.smartcampus.erp.domain.shared.BaseEntity;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Activates Spring Data JPA's auditing infrastructure for the entire
 * application.
 *
 * <h2>Why auditing is separated into its own configuration class</h2>
 * It would be possible to drop {@code @EnableJpaAuditing} onto any
 * existing {@code @Configuration} class — the main application class,
 * {@code SecurityConfig}, anywhere. Giving it its own class instead keeps
 * the same discipline established by {@code PasswordEncoderConfig}: a
 * single, narrowly-named file means a developer scanning the
 * {@code config} package can tell exactly what's enabled and why without
 * reading through unrelated security or CORS logic. It also means
 * auditing can be selectively excluded — for example from a lightweight
 * unit-test {@code @SpringBootTest} slice — by simply not importing this
 * one class, without having to carve auditing concerns out of a larger,
 * multi-purpose configuration.
 *
 * <h2>How {@code @CreatedDate} works</h2>
 * {@code @EnableJpaAuditing} activates Spring Data's
 * {@code AuditingHandler}, which the {@code AuditingEntityListener}
 * registered on {@link BaseEntity} delegates to during JPA lifecycle
 * callbacks. On the {@code @PrePersist} callback — i.e. the moment an
 * entity is first inserted — the handler scans the entity for a field
 * annotated {@code @CreatedDate} and stamps it with the current timestamp.
 * Critically, this only happens once: on every subsequent update to that
 * same row, {@code @PrePersist} does not fire again, so the original
 * creation timestamp is never overwritten.
 *
 * <h2>How {@code @LastModifiedDate} works</h2>
 * The same listener also hooks the {@code @PreUpdate} callback (and, like
 * {@code @CreatedDate}, the very first {@code @PrePersist} as well, since
 * an entity's creation is also its first "modification"). Every time an
 * entity is saved — insert or update — the field annotated
 * {@code @LastModifiedDate} is stamped with the current timestamp,
 * keeping it continuously accurate as a "last touched" marker without any
 * application code ever calling {@code setUpdatedAt(...)} itself.
 *
 * <h2>Why {@link BaseEntity} depends on this configuration</h2>
 * {@code @CreatedDate}, {@code @LastModifiedDate}, and
 * {@code @EntityListeners(AuditingEntityListener.class)} on
 * {@code BaseEntity} are purely declarative metadata — they describe
 * *what* should happen, but the underlying {@code AuditingHandler} that
 * actually performs the stamping is only registered in the Spring context
 * when {@code @EnableJpaAuditing} is present somewhere. Without this
 * class, none of that wiring exists: {@code BaseEntity}'s listener would
 * fire, find no active auditing handler to delegate to, and every
 * {@code createdAt}/{@code updatedAt} field across every entity in the
 * system would silently persist as {@code null} — no exception, no log
 * warning, just quietly wrong data. This file is what turns
 * {@code BaseEntity}'s audit annotations from inert metadata into working
 * behavior.
 *
 * <h2>Why this keeps entities free from manual timestamp management</h2>
 * With this configuration active, no service class anywhere in the
 * codebase — across Auth, Student, Faculty, Attendance, Library, Finance,
 * Examination, or Settings — ever needs to write
 * {@code entity.setCreatedAt(LocalDateTime.now())} or
 * {@code entity.setUpdatedAt(LocalDateTime.now())}. That responsibility is
 * removed from business logic entirely and centralized into a single,
 * infrastructure-level mechanism. The practical benefits compound across a
 * codebase this size: service classes stay focused purely on business
 * rules (Single Responsibility), an entire category of bug — a developer
 * forgetting to update a timestamp in one of dozens of write paths — is
 * eliminated structurally rather than relying on code review to catch it,
 * and every timestamp in the system is guaranteed to come from exactly
 * one source of truth.
 *
 * <p><b>Future extension point:</b> when the Auth module introduces an
 * authenticated principal, a natural next step is an
 * {@code AuditorAware<T>} bean here to auto-populate
 * {@code createdBy}/{@code updatedBy} fields the same way — using
 * {@code @CreatedBy}/{@code @LastModifiedBy} — without any change to how
 * entities are written.</p>
 *
 * @author Smart Campus ERP Engineering
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}