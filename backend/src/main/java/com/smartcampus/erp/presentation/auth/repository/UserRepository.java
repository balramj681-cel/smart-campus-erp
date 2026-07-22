package com.smartcampus.erp.infrastructure.persistence.auth.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Role;

/**
 * Spring Data JPA repository for {@link User}.
 *
 * <h2>Why repositories belong in the infrastructure layer</h2>
 * This interface contains no SQL and no Hibernate-specific code — every method
 * is implemented automatically by Spring Data JPA. Even so, the single line
 * {@code extends JpaRepository<User, UUID>} is a real, load-bearing dependency
 * on a specific persistence technology. If the project ever swapped
 * JPA/Hibernate for a different data-access approach for this module, this file
 * is exactly what would have to change. That's the defining trait of an
 * infrastructure-layer concern: it depends on a swappable technical detail,
 * whereas {@code domain} and {@code application} should never need to know or
 * care how a {@code User} actually gets persisted. It lives in
 * {@code infrastructure/persistence/auth/repository} for precisely that reason
 * — "how do we fetch a user from PostgreSQL" is an implementation detail, not a
 * business rule.
 *
 * <h2>Why services depend on repository interfaces instead of
 * {@code EntityManager}</h2>
 * A service class could use Jakarta Persistence's {@code EntityManager}
 * directly, but that drags low-level persistence mechanics —
 * {@code em.createQuery(...)}, manual query construction, flush/clear semantics
 * — straight into business logic, and couples every service to the entire
 * surface area of JPA. Depending on this narrow, intention-revealing interface
 * instead means a service expresses
 * <i>what</i> it needs ({@code findByEmail}, {@code existsByEmail}) in business
 * vocabulary, not <i>how</i> to get it. It is also dramatically easier to test:
 * mocking {@code UserRepository.findByEmail(...)} is a one-line stub, versus
 * mocking an {@code EntityManager}'s entire query-building API. The service
 * depends on an abstraction at the edge of the system, not a low-level
 * persistence API leaking into the middle of it — Dependency Inversion in
 * practice.
 *
 * <h2>Why {@code Optional} is used for {@code findByEmail()}</h2>
 * "No account with this email" is an entirely ordinary outcome of a login
 * attempt — a mistyped address, or simply no account — not an exceptional
 * failure. Returning a raw, nullable {@code User} would rely on every caller
 * remembering to null-check it; forget once, and a login flow throws a
 * {@code NullPointerException} instead of a meaningful "invalid credentials"
 * response. {@link Optional} forces that possibility into the method's type
 * signature itself, so the compiler and IDE surface it at every call site, and
 * resolving it — typically
 * {@code .orElseThrow(InvalidCredentialsException::new)} in the future login
 * use case — becomes a deliberate, readable decision instead of an implicit
 * risk.
 *
 * <h2>Why {@code existsByEmail()} is more efficient than loading the
 * entity</h2>
 * Checking {@code findByEmail(email).isPresent()} would force Hibernate to
 * fully hydrate a {@code User} — every column, mapped into a managed object —
 * only to immediately discard it and check a boolean.
 * {@code existsByEmail(...)} is translated by Spring Data JPA into a
 * lightweight existence-style query the database can short-circuit the instant
 * it finds (or rules out) a match, without materializing a full row into Java
 * at all. For a hot path like registration's "is this email already taken"
 * check, that's a meaningfully cheaper query — and the difference only grows as
 * the {@code users} table does.
 *
 * <h2>Why Spring Data JPA generates implementations automatically from method
 * names</h2>
 * Spring Data JPA parses a method signature like
 * {@code findAllByRole(Role role)} against its query-derivation grammar
 * ({@code findBy}/{@code existsBy}/{@code countBy} + property name) at
 * application startup, builds the equivalent JPQL query reflectively, and
 * generates a runtime proxy implementing this interface — there is no
 * hand-written implementation class anywhere. This eliminates an entire
 * category of repetitive, easy-to-subtly-break boilerplate (hand-rolled
 * {@code findByX} methods against a raw connection/session), while remaining
 * fully type-safe: a typo in a derived method name (e.g. {@code findByEmial})
 * fails immediately at application startup, when Spring Data validates it
 * against {@code User}'s actual properties — not silently at runtime in
 * production.
 *
 * <h2>How this repository will be used going forward</h2>
 * <ul>
 * <li><b>Login</b> — the future login use case (and the
 * {@code CustomUserDetailsService} that Spring Security's
 * {@code AuthenticationManager} calls during authentication) will use
 * {@link #findByEmail(String)} to resolve the account being authenticated.</li>
 * <li><b>Registration</b> — {@link #existsByEmail(String)} provides the
 * application-level "email already taken" pre-check before an insert is
 * attempted, working alongside (not instead of) the database-level unique
 * constraint already on {@code User.email}.</li>
 * <li><b>User Management</b> — {@link #findAllByRole(Role)} and
 * {@link #findAllByEnabled(boolean)} power admin screens such as "list all
 * Faculty" or "show deactivated accounts"; {@link #countByRole(Role)} and
 * {@link #countByEnabled(boolean)} power dashboard summary statistics (e.g. a
 * "342 Students / 28 Faculty" overview card).</li>
 * <li><b>JWT authentication</b> — once a request's JWT is parsed, the future
 * JWT filter will resolve the token's subject back into a full {@code User}
 * (via {@link #findByEmail(String)} or the id-based lookups inherited from
 * {@code JpaRepository}) to rebuild the Spring Security {@code Authentication}
 * object for that request.</li>
 * </ul>
 *
 * @author Smart Campus ERP Engineering
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Looks up a user by their unique login email.
     *
     * @param email the email to search for (case sensitivity follows the
     * database column collation)
     * @return an {@link Optional} containing the matching user, or empty if no
     * account has this email
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether an account already exists for the given email, without
     * loading the entity itself.
     *
     * @param email the email to check
     * @return {@code true} if a user with this email exists
     */
    boolean existsByEmail(String email);

    /**
     * Retrieves every user assigned a specific {@link Role}.
     *
     * @param role the role to filter by
     * @return all matching users, possibly empty
     */
    List<User> findAllByRole(Role role);

    /**
     * Retrieves every user whose {@code enabled} flag matches the given value —
     * e.g. {@code findAllByEnabled(false)} for deactivated accounts.
     *
     * @param enabled the enabled state to filter by
     * @return all matching users, possibly empty
     */
    List<User> findAllByEnabled(boolean enabled);

    /**
     * Counts how many users hold a specific {@link Role}, without loading any
     * of them.
     *
     * @param role the role to count
     * @return the number of users with this role
     */
    long countByRole(Role role);

    /**
     * Counts how many users have the given {@code enabled} state, without
     * loading any of them.
     *
     * @param enabled the enabled state to count
     * @return the number of users matching this state
     */
    long countByEnabled(boolean enabled);


    long countByRoleAndEnabled(Role role, boolean enabled);

    // ── Pageable variants (User Management ke liye) ───────────────────────
    org.springframework.data.domain.Page<User> findByRole(
            Role role,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<User> findByEnabled(
            boolean enabled,
            org.springframework.data.domain.Pageable pageable);

    // ── Full-text search (first name, last name, ya email se) ─────────────
    @org.springframework.data.jpa.repository.Query("""
            SELECT u FROM User u
            WHERE LOWER(u.firstName) LIKE %:q%
               OR LOWER(u.lastName)  LIKE %:q%
               OR LOWER(u.email)     LIKE %:q%
            """)
    org.springframework.data.domain.Page<User> findBySearch(
            @org.springframework.data.repository.query.Param("q") String query,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("""
            SELECT u FROM User u
            WHERE u.role = :role
              AND (LOWER(u.firstName) LIKE %:q%
               OR  LOWER(u.lastName)  LIKE %:q%
               OR  LOWER(u.email)     LIKE %:q%)
            """)
    org.springframework.data.domain.Page<User> findBySearchAndRole(
            @org.springframework.data.repository.query.Param("q") String query,
            @org.springframework.data.repository.query.Param("role") Role role,
            org.springframework.data.domain.Pageable pageable);
}
