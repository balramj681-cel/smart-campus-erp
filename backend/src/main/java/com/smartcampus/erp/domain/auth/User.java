package com.smartcampus.erp.domain.auth;
 
import java.time.LocalDateTime;
 
import com.smartcampus.erp.domain.shared.BaseEntity;
import com.smartcampus.erp.domain.shared.enums.Role;
 
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
/**
 * The core identity entity for the Smart Campus ERP. A single
 * {@code User} row represents one login-capable account, regardless of
 * whether that person is a Super Admin, Faculty member, Student, or any
 * other {@link Role} — the ERP has one unified login surface, not a
 * separate table per role.
 *
 * <h2>Why User extends {@link BaseEntity}</h2>
 * Like every other entity in this system, a user needs a primary key and
 * an audit trail of when the account was created and last modified.
 * Extending {@code BaseEntity} gets all three for free — consistent with
 * the pragmatic Clean Architecture approach already established for this
 * codebase: entities live in {@code domain} and carry their own JPA
 * mapping, rather than maintaining a parallel framework-free POJO and a
 * separate persistence entity for every field. This file continues that
 * same convention deliberately, not by accident.
 *
 * <h2>Why email is unique</h2>
 * Email is the single login identifier across every role in the ERP — an
 * Admin, a Faculty member, and a Student all authenticate through the same
 * {@code /api/auth/login} endpoint using their email. If two accounts
 * could share an email, login would be ambiguous: which account does the
 * submitted password belong to? The {@code unique = true} constraint is
 * enforced at the database level rather than relying solely on an
 * application-level "does this email already exist" check, because that
 * check has a race condition — two concurrent registration requests for
 * the same email could both pass the check before either commits. Only a
 * database-level uniqueness constraint is atomic enough to close that gap.
 *
 * <h2>Why password stores only BCrypt hashes</h2>
 * This column never holds a plaintext password — it stores the output of
 * the {@code PasswordEncoder} bean (see {@code PasswordEncoderConfig})
 * after hashing, both at registration and whenever a password is changed.
 * {@code length = 255} is deliberately generous: a BCrypt hash is
 * consistently around 60 characters, but sizing the column with headroom
 * means a future migration to a different algorithm (e.g. Argon2, whose
 * encoded output can run longer) doesn't require a schema change. Note
 * that this entity has no hashing logic of its own and never will — it is
 * a passive data holder. Hashing and verification are the responsibility
 * of the service layer using the injected {@code PasswordEncoder}, keeping
 * security logic out of the entity (Single Responsibility Principle).
 *
 * <h2>Why role uses {@code EnumType.STRING}</h2>
 * {@code EnumType.ORDINAL} would store {@link Role} as its integer
 * position (0, 1, 2…) in the enum declaration — compact, but dangerously
 * fragile: inserting a new constant anywhere except the very end of
 * {@link Role}, or reordering existing ones, would silently reassign every
 * existing user's role to the wrong value with no error at compile time or
 * runtime. {@code EnumType.STRING} stores the literal constant name
 * (e.g. {@code "ADMIN"}), which is immune to reordering, self-describing
 * when a DBA inspects the table directly with raw SQL, and trivially safe
 * to extend with new roles in any position. The minor extra storage cost
 * is irrelevant at the row counts an institution's user table will ever
 * reach.
 *
 * <h2>Why boolean flags are separated instead of a single status enum</h2>
 * {@code enabled}, {@code accountLocked}, and {@code emailVerified}
 * represent three <i>independent</i> axes of account state, not mutually
 * exclusive ones. A newly registered user can be {@code enabled = true}
 * but {@code emailVerified = false} while completing onboarding. An admin
 * can manually deactivate an account ({@code enabled = false}) without
 * that account ever having triggered a security lockout
 * ({@code accountLocked} staying {@code false}). A single
 * {@code AccountStatus} enum would force these orthogonal concerns into
 * one mutually-exclusive value — and immediately face an impossible
 * question: what single status represents "disabled by an admin AND
 * locked from failed logins AND not yet email-verified," all at once?
 * You'd need a combinatorial explosion of enum values to express it. Three
 * independent booleans model three independent business rules cleanly, and
 * each can be toggled by its own workflow (admin deactivation, login
 * lockout, email verification) without disturbing the others.
 *
 * <h2>Why {@code lastLoginAt} is useful</h2>
 * It is intentionally distinct from the {@code updatedAt} timestamp
 * inherited from {@link BaseEntity}. {@code updatedAt} changes whenever
 * <i>any</i> field on the row changes — an admin editing this user's phone
 * number updates it without the user ever logging in. {@code lastLoginAt}
 * is set only by the login flow itself, making it a reliable signal for
 * dormant-account detection, "last seen" reporting on admin dashboards,
 * and spotting unusual login patterns — none of which {@code updatedAt}
 * can answer on its own.
 *
 * <h2>Why this entity is intentionally independent from Spring Security interfaces</h2>
 * {@code User} does not implement {@code UserDetails}, and deliberately
 * so. {@code UserDetails} is a Spring-Security-specific contract — coupling
 * this entity to it would mean every domain-level use of {@code User}
 * (registration, profile updates, admin user management) carries Spring
 * Security's API surface along for the ride, whether it needs it or not.
 * Instead, an upcoming {@code infrastructure/security/userdetails} class
 * will adapt a {@code User} into a {@code UserDetails} implementation —
 * the translation lives in the infrastructure layer, where
 * framework-specific adapters belong, leaving this entity free to be
 * exactly what it is: a record of who a user is, not how Spring Security
 * happens to consume that information.
 *
 * <p><b>Note on first/last name constraints:</b> the spec for this entity
 * did not specify explicit nullability/length for {@code firstName}/
 * {@code lastName}; {@code nullable = false, length = 100} below is a
 * reasonable inference (every account needs a name), flagged here in case
 * that should be loosened. Note also that none of the {@code @Column}
 * constraints on this entity replace request-level validation —
 * {@code @NotNull}/{@code @Email}-style Bean Validation belongs on the
 * Auth module's request DTOs in {@code interfaces/rest/auth/dto/request},
 * not duplicated here. These are persistence-level integrity constraints,
 * not input validation.</p>
 *
 * @author Smart Campus ERP Engineering
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "phone_number", nullable = true, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    /**
     * Whether this account may authenticate at all. Defaults to
     * {@code true}; an admin can flip this to {@code false} to deactivate
     * an account without deleting it.
     */
    @Builder.Default
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    /**
     * Whether this account is locked out, typically as a result of
     * repeated failed login attempts. Defaults to {@code false}.
     */
    @Builder.Default
    @Column(name = "account_locked", nullable = false)
    private boolean accountLocked = false;

    /**
     * Whether the user has confirmed ownership of their email address.
     * Defaults to {@code false} until the verification flow completes.
     */
    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    /**
     * Timestamp of this user's most recent successful login. {@code null}
     * for an account that has never logged in. Set exclusively by the
     * login use case — see class-level Javadoc for why this is distinct
     * from {@code updatedAt}.
     */
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    /**
     * Convenience accessor combining {@link #firstName} and
     * {@link #lastName} for display purposes (UI headers, email
     * greetings, audit logs) without every caller re-implementing the
     * concatenation.
     *
     * @return this user's first and last name, space-separated
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }

    /**
     * Delegates to {@link Role#isAdmin()}. Returns {@code false} rather
     * than throwing if {@link #role} has not yet been assigned.
     *
     * @return {@code true} if this user's role is an administrative one
     */
    public boolean isAdmin() {
        return role != null && role.isAdmin();
    }

    /**
     * {@link Role} does not expose a dedicated "is student" predicate of
     * its own, so this compares directly against {@link Role#STUDENT}
     * rather than delegating.
     *
     * @return {@code true} if this user's role is exactly {@code STUDENT}
     */
    public boolean isStudent() {
        return role == Role.STUDENT;
    }

    /**
     * {@link Role} does not expose a dedicated "is faculty" predicate of
     * its own, so this compares directly against {@link Role#FACULTY}
     * rather than delegating.
     *
     * @return {@code true} if this user's role is exactly {@code FACULTY}
     */
    public boolean isFaculty() {
        return role == Role.FACULTY;
    }




     // ─── OTP Fields ──────────────────────────────────────────────────────────
    // OTP DB mein store hota hai (hashed).
    // Verify hone ke baad teeno null ho jaate hain.
 
    /** BCrypt-hashed OTP. Null jab koi OTP pending nahi. */
    @Column(name = "otp_hash", length = 255)
    private String otpHash;
 
    /** OTP kab expire hoga. */
    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;
 
    /** Kitni baar galat OTP dala. Max 3 ke baad block. */
    @Builder.Default
    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts = 0;
 
 
    /** OTP valid hai ya nahi — null check + expiry check. */
    public boolean hasValidOtp() {
        return otpHash != null
                && otpExpiresAt != null
                && LocalDateTime.now().isBefore(otpExpiresAt);
    }
 
    /** OTP fields clear karo after successful verification. */
    public void clearOtp() {
        this.otpHash = null;
        this.otpExpiresAt = null;
        this.otpAttempts = 0;
    }


    //Photo:
    @Column(name = "photo_url", length = 255)
    private String photoUrl;
}