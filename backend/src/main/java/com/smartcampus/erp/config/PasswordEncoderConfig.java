package com.smartcampus.erp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Exposes the application's {@link PasswordEncoder} bean.
 *
 * <h2>Why this lives in its own configuration class</h2>
 * It would be easy to declare this {@code @Bean} directly inside
 * {@code SecurityConfig}, but that creates two real problems in an
 * enterprise Spring Security setup:
 *
 * <ol>
 *   <li><b>Circular bean dependencies.</b> {@code SecurityConfig} typically
 *       builds an {@code AuthenticationManager} / {@code AuthenticationProvider}
 *       that itself needs a {@code PasswordEncoder} as a constructor or method
 *       argument. If both beans are declared in the same {@code @Configuration}
 *       class, Spring can fail to resolve the dependency graph during context
 *       startup ({@code BeanCurrentlyInCreationException}), because the
 *       {@code PasswordEncoder} bean method may not have been processed yet
 *       when the security chain is being built. Extracting it into an
 *       independent configuration class with no dependencies on
 *       {@code SecurityConfig} removes that ordering problem entirely.</li>
 *
 *   <li><b>Single Responsibility Principle.</b> {@code SecurityConfig} is
 *       already a large class once the {@code SecurityFilterChain}, CORS
 *       rules, JWT filter wiring, and exception handlers land in it. Password
 *       hashing strategy is a distinct, independently testable concern — it
 *       has nothing to do with HTTP request authorization rules — and
 *       deserves its own narrowly-scoped class.</li>
 * </ol>
 *
 * <h2>Why the bean is typed as {@code PasswordEncoder}, not {@code BCryptPasswordEncoder}</h2>
 * Every consumer (user-registration services, credential-matching logic,
 * password-reset flows) depends on the {@link PasswordEncoder} interface,
 * never the concrete {@link BCryptPasswordEncoder} implementation. This is
 * the Dependency Inversion Principle in practice: if a future security
 * audit calls for migrating to {@code Argon2PasswordEncoder} (OWASP's
 * current top recommendation for new systems) or a
 * {@code DelegatingPasswordEncoder} that supports multiple hash formats
 * during a rolling migration, only this one bean definition changes —
 * every class that injects {@code PasswordEncoder} is untouched.
 *
 * <h2>Why BCrypt</h2>
 * BCrypt is a deliberately slow, adaptive hashing algorithm purpose-built
 * for password storage:
 * <ul>
 *   <li>It generates and embeds a random salt per password automatically,
 *       so two users with identical passwords never produce identical
 *       hashes — defeating rainbow-table attacks.</li>
 *   <li>Its work factor (the "strength" parameter below) can be increased
 *       over time as hardware gets faster, keeping brute-force attacks
 *       computationally expensive without changing the algorithm.</li>
 *   <li>It is the long-standing default recommendation in the Spring
 *       Security ecosystem and is battle-tested in production at scale.</li>
 * </ul>
 *
 * @author Smart Campus ERP Engineering
 */
@Configuration
public class PasswordEncoderConfig {

    /**
     * BCrypt work factor (log2 of the number of hashing rounds).
     *
     * <p>Spring Security's {@link BCryptPasswordEncoder} defaults to a
     * strength of {@code 10}. We explicitly use {@code 12} here: each
     * increment doubles the hashing cost, so {@code 12} is roughly 4x
     * slower than the default per hash. For an ERP system handling
     * institution-wide staff and student credentials, that extra cost is a
     * worthwhile trade against brute-force and credential-stuffing
     * attacks, while still completing in well under 100ms on modern
     * hardware — negligible for a login request.</p>
     */
    private static final int BCRYPT_STRENGTH = 12;

    /**
     * Defines the singleton {@link PasswordEncoder} used application-wide
     * for hashing passwords on registration/reset and verifying them on
     * login.
     *
     * <p>Spring manages this as a singleton bean, so the same encoder
     * instance — and therefore the same work factor — is used consistently
     * everywhere a password is hashed or checked.</p>
     *
     * @return a {@link BCryptPasswordEncoder} configured with
     *         {@link #BCRYPT_STRENGTH} hashing rounds
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }
}