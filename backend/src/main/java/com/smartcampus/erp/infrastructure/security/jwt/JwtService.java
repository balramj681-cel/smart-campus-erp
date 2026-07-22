package com.smartcampus.erp.infrastructure.security.jwt;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.domain.shared.enums.Role;
import com.smartcampus.erp.infrastructure.security.jwt.exception.JwtAuthenticationException;
import com.smartcampus.erp.infrastructure.security.jwt.exception.JwtTokenExpiredException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Core JWT (JSON Web Token) service for the Smart Campus ERP authentication infrastructure.
 *
 * <h2>Responsibility</h2>
 * <p>
 * This service owns the complete JWT lifecycle within the application:
 * token generation (access and refresh), claim extraction, cryptographic
 * signature verification, and expiry validation. No other class in the system
 * should perform raw JWT operations — all token concerns are delegated here.
 * This design enforces the <b>Single Responsibility Principle (SRP)</b> and
 * creates a single, auditable boundary around credential-handling logic.
 * </p>
 *
 * <h2>Token Strategy</h2>
 * <p>
 * The system uses a <b>dual-token strategy</b>:
 * </p>
 * <ul>
 *   <li>
 *     <b>Access Token</b> — Short-lived (configured via
 *     {@code security.jwt.access-token-expiration}). Sent on every authenticated
 *     HTTP request. Embeds the user's role and UUID so that downstream handlers
 *     can make authorisation decisions without an additional database round-trip.
 *   </li>
 *   <li>
 *     <b>Refresh Token</b> — Long-lived (configured via
 *     {@code security.jwt.refresh-token-expiration}). Used exclusively by the
 *     token-refresh endpoint. Carries minimal claims intentionally: when a new
 *     access token is issued, role and account state are re-read from the database
 *     to guarantee they reflect the current truth (e.g., a role change that occurred
 *     while the user's session was active).
 *   </li>
 * </ul>
 *
 * <h2>Cryptography</h2>
 * <p>
 * Tokens are signed with <b>HMAC-SHA-256 (HS256)</b> using a symmetric
 * {@link SecretKey} derived from the externally-configured Base64-encoded secret.
 * HS256 is appropriate for a monolithic application where the same service both
 * issues and verifies tokens. The key is derived once at startup via
 * {@link #initSigningKey()} and reused for all operations, avoiding repeated
 * heap allocation per request.
 * </p>
 * <p>
 * The configured secret must decode to at least 256 bits (32 bytes) to meet
 * the HMAC-SHA-256 minimum key length. {@link Keys#hmacShaKeyFor(byte[])} enforces
 * this requirement and throws {@link io.jsonwebtoken.security.WeakKeyException}
 * at startup if the constraint is violated.
 * </p>
 *
 * <h2>JJWT 0.12.x API</h2>
 * <p>
 * This implementation uses exclusively the <b>JJWT 0.12.x fluent API</b>.
 * Notable API changes from earlier versions that this class honours:
 * </p>
 * <ul>
 *   <li>{@code Jwts.parserBuilder()} was removed; use {@code Jwts.parser()} instead.</li>
 *   <li>{@code .setSubject()}, {@code .setIssuedAt()}, etc. were removed;
 *       use {@code .subject()}, {@code .issuedAt()} etc. instead.</li>
 *   <li>{@code .parseClaimsJws()} was removed; use {@code .parseSignedClaims()} instead.</li>
 *   <li>{@code SignatureAlgorithm} enum constants are no longer passed to {@code signWith()};
 *       JJWT infers the algorithm from the {@link SecretKey} type automatically.</li>
 * </ul>
 *
 * <h2>Exception Strategy</h2>
 * <p>
 * All JJWT library exceptions are caught and mapped to domain exceptions defined in
 * {@code com.smartcampus.erp.infrastructure.security.jwt.exception}. This prevents
 * the JJWT library from leaking into higher application layers and allows the global
 * exception handler to work against stable, library-agnostic types:
 * </p>
 * <ul>
 *   <li>{@link ExpiredJwtException} → {@link JwtTokenExpiredException}
 *       (client should attempt a silent refresh)</li>
 *   <li>All other JWT failures → {@link JwtAuthenticationException}
 *       (client should force re-login)</li>
 * </ul>
 *
 * <h2>Security Notes</h2>
 * <ul>
 *   <li>Raw token strings are <em>never</em> written to any log at any level.</li>
 *   <li>Every token carries a unique {@code jti} (JWT ID) claim — a UUID — that serves
 *       as the anchor for future token revocation via a denylist (e.g., Redis).</li>
 *   <li>The {@code iss} (issuer) claim is written on every token and verified on every
 *       parse, preventing tokens issued by a different environment (e.g., staging) or
 *       service from being accepted in production.</li>
 * </ul>
 *
 * @author  Smart Campus ERP Engineering
 * @version 1.0.0
 * @since   2025
 * @see     JwtProperties
 * @see     JwtAuthenticationException
 * @see     JwtTokenExpiredException
 */
@Slf4j
@Service
public class JwtService {

    // =========================================================================
    // CLAIM KEY CONSTANTS
    //
    // Centralising claim name strings as constants eliminates typo-driven bugs
    // that arise when the same string literal is written in both the generation
    // and the extraction path. A rename is a single-location change.
    // =========================================================================

    /**
     * Custom claim key carrying the user's assigned authority role
     * (e.g., {@code "ROLE_STUDENT"}). Embedded in access tokens so that
     * downstream handlers can make authorisation decisions without a DB round-trip.
     */
    private static final String CLAIM_ROLE = "role";

    /**
     * Custom claim key carrying the user's internal UUID primary key.
     * Embedded in access tokens to allow downstream services to resolve the
     * user record without re-querying by email.
     */
    private static final String CLAIM_USER_ID = "uid";

    /**
     * Custom claim key that discriminates between access and refresh tokens.
     * Verified by {@link #isTokenValid} and {@link #isRefreshTokenValid} to
     * prevent a refresh token from being accepted as a general API credential.
     */
    private static final String CLAIM_TOKEN_TYPE = "type";

    /** Discriminator value embedded in access tokens. */
    private static final String TOKEN_TYPE_ACCESS = "ACCESS";

    /** Discriminator value embedded in refresh tokens. */
    private static final String TOKEN_TYPE_REFRESH = "REFRESH";

    // =========================================================================
    // DEPENDENCIES
    // =========================================================================

    /**
     * Externalised JWT configuration bound from {@code application.yml}.
     *
     * <p>Injected via constructor to keep the class unit-testable without a
     * Spring application context. All timing, issuer, and secret values are
     * read exclusively from this object — no magic literals exist in this class.
     */
    private final JwtProperties jwtProperties;

    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * The HMAC-SHA-256 signing key, derived once from the configured Base64 secret.
     *
     * <p>Initialised by {@link #initSigningKey()} rather than in the constructor
     * so that startup failures (key too short, invalid Base64) surface as a clear
     * {@link PostConstruct} exception rather than a constructor exception, which
     * Spring Boot reports more legibly.
     *
     * <p>Declared {@code volatile} to guarantee safe publication to all threads
     * after the {@code @PostConstruct} method completes on the initialising thread.
     */
    private volatile SecretKey signingKey;

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * Constructs the service with its sole required dependency.
     *
     * <p>Constructor injection is used exclusively throughout this codebase.
     * It makes the dependency graph explicit, supports immutability, and allows
     * the class to be instantiated in unit tests without a Spring context.
     *
     * @param jwtProperties the externalised JWT configuration; must not be {@code null}
     */
    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    /**
     * Derives the HMAC-SHA-256 {@link SecretKey} from the configured Base64-encoded
     * secret and stores it for reuse across all token operations.
     *
     * <p><b>Why {@code @PostConstruct} instead of the constructor?</b><br>
     * Spring performs dependency injection before invoking {@code @PostConstruct}.
     * Placing key derivation here guarantees that {@code jwtProperties} is fully
     * populated (including any {@code @ConfigurationProperties} binding) before the
     * key is derived. It also produces a cleaner startup error if the secret is
     * misconfigured, since Spring wraps {@code @PostConstruct} failures with a
     * descriptive {@code BeanCreationException}.
     *
     * <p><b>Why Base64 decoding?</b><br>
     * {@link Keys#hmacShaKeyFor(byte[])} expects raw bytes, not the Base64 string.
     * Storing the secret as Base64 in {@code application.yml} is standard practice:
     * it avoids encoding issues with special characters and clearly communicates
     * that the value is not a plaintext password.
     *
     * @throws io.jsonwebtoken.security.WeakKeyException if the decoded key is fewer
     *         than 256 bits, which is the minimum for HS256
     * @throws IllegalArgumentException if the configured secret is not valid Base64
     */
    @PostConstruct
    void initSigningKey() {
        log.info("[JwtService] Deriving HMAC-SHA-256 signing key from configured secret");
        byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getSecret());
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        log.info("[JwtService] Signing key initialised successfully");
    }

    // =========================================================================
    // TOKEN GENERATION — PUBLIC API
    // =========================================================================

    /**
     * Generates a short-lived <b>access token</b> for the given authenticated principal.
     *
     * <p>Access tokens are included in the {@code Authorization: Bearer <token>} header
     * of every authenticated HTTP request. Their short lifespan (controlled by
     * {@code security.jwt.access-token-expiration}) limits the exposure window if a
     * token is intercepted or exfiltrated from a client device.
     *
     * <p>The following claims are embedded in the token payload:
     * <ul>
     *   <li>{@code sub}  — the user's email address (the stable, unique login identifier)</li>
     *   <li>{@code role} — the user's authority string (e.g., {@code "ROLE_STUDENT"});
     *       embedded to avoid a DB lookup per request in the authentication filter</li>
     *   <li>{@code uid}  — the user's UUID primary key; embedded for downstream service use</li>
     *   <li>{@code type} — literal {@code "ACCESS"}; verified on every validation call</li>
     *   <li>{@code iss}  — the configured issuer identifier</li>
     *   <li>{@code iat}  — the issue timestamp (now)</li>
     *   <li>{@code exp}  — the expiration timestamp (now + access token TTL)</li>
     *   <li>{@code jti}  — a UUID; the anchor for future token revocation via a denylist</li>
     * </ul>
     *
     * @param userDetails the Spring Security principal for the authenticated user;
     *                    {@link UserDetails#getUsername()} must return the user's email
     * @param userId      the user's internal UUID primary key; must not be {@code null}
     * @param role        the user's domain {@link Role} enum constant; {@code role.getAuthority()} is embedded
     *                    as the Spring-Security-compatible authority string (e.g., {@code "ROLE_STUDENT"}).
     *                    Accepting the typed enum rather than a raw {@code String} prevents callers
     *                    from passing an arbitrary or malformed role value and keeps the method's
     *                    contract aligned with the domain model
     * @return a compact, URL-safe, signed JWT string
     * @throws IllegalArgumentException if {@code userDetails}, {@code userId}, or {@code role} is {@code null}
     */
    public String generateAccessToken(UserDetails userDetails, UUID userId, Role role) {
        log.debug("[JwtService] Generating access token for principal: {}", userDetails.getUsername());

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put(CLAIM_ROLE, role.getAuthority());
        extraClaims.put(CLAIM_USER_ID, userId.toString());
        extraClaims.put(CLAIM_TOKEN_TYPE, TOKEN_TYPE_ACCESS);

        return buildToken(userDetails.getUsername(), extraClaims,
                jwtProperties.getAccessTokenExpiration());
    }

    /**
     * Generates a long-lived <b>refresh token</b> for the given authenticated principal.
     *
     * <p>Refresh tokens are stored securely by the client (ideally in an
     * {@code HttpOnly; Secure; SameSite=Strict} cookie) and are submitted only to the
     * dedicated token-refresh endpoint. They must <em>not</em> be accepted as credentials
     * on general API endpoints — the {@code type} claim is verified during validation to
     * enforce this constraint.
     *
     * <p>Refresh tokens carry <b>minimal claims by design</b>. Role and account state are
     * intentionally excluded: if the user's role changes between token issuance and refresh,
     * the stale claim must not be re-embedded in the new access token. The new access token
     * is always built from the current database state.
     *
     * <p>The {@code uid} claim <em>is</em> included in the refresh token. Unlike role, the
     * user's UUID is immutable for the lifetime of the account. Embedding it allows the
     * token-refresh endpoint to locate the user record by primary key rather than by email,
     * which is more efficient and robust against an (extremely rare) email change.
     *
     * <p>Claims embedded:
     * <ul>
     *   <li>{@code sub}  — the user's email address</li>
     *   <li>{@code uid}  — the user's immutable UUID primary key</li>
     *   <li>{@code type} — literal {@code "REFRESH"}</li>
     *   <li>{@code iss}  — the configured issuer identifier</li>
     *   <li>{@code iat}  — the issue timestamp</li>
     *   <li>{@code exp}  — the expiration timestamp (now + refresh token TTL)</li>
     *   <li>{@code jti}  — a UUID for revocation tracking</li>
     * </ul>
     *
     * @param userDetails the Spring Security principal for the authenticated user;
     *                    {@link UserDetails#getUsername()} must return the user's email
     * @param userId      the user's immutable UUID primary key; embedded so the refresh
     *                    endpoint can resolve the user by PK rather than by email
     * @return a compact, URL-safe, signed JWT string
     */
    public String generateRefreshToken(UserDetails userDetails, UUID userId) {
        log.debug("[JwtService] Generating refresh token for principal: {}", userDetails.getUsername());

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put(CLAIM_USER_ID, userId.toString());
        extraClaims.put(CLAIM_TOKEN_TYPE, TOKEN_TYPE_REFRESH);

        return buildToken(userDetails.getUsername(), extraClaims,
                jwtProperties.getRefreshTokenExpiration());
    }

    // =========================================================================
    // CLAIM EXTRACTION — PUBLIC API
    // =========================================================================

    /**
     * Extracts the username (the {@code sub} claim) from a token.
     *
     * <p>This is the primary identity accessor used by
     * {@code JwtAuthenticationFilter} to identify which {@link UserDetails} to load
     * once a token has been structurally verified.
     *
     * @param token the raw JWT string (without the {@code "Bearer "} prefix)
     * @return the {@code sub} claim value — the user's email address
     * @throws JwtTokenExpiredException   if the token has passed its expiration time
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the expiration date from a token.
     *
     * <p>Exposed publicly for callers that need to propagate TTL information —
     * for example, setting an {@code HttpOnly} cookie's {@code Max-Age} to match
     * the remaining lifetime of the access token.
     *
     * @param token the raw JWT string
     * @return the {@link Date} after which the token is considered expired
     * @throws JwtTokenExpiredException   if the token has already expired
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts the token type discriminator ({@code "ACCESS"} or {@code "REFRESH"}).
     *
     * <p>Used by validation methods to enforce that access-token endpoints do not
     * accept refresh tokens and vice versa.
     *
     * @param token the raw JWT string
     * @return the token type string
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get(CLAIM_TOKEN_TYPE, String.class));
    }

    /**
     * Extracts the user UUID ({@code uid} claim) embedded in an access token.
     *
     * @param token the raw JWT access token
     * @return the user's UUID as a {@link String}
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException if the claim is absent or the token is invalid
     */
    public String extractUserId(String token) {
        return extractClaim(token, claims -> claims.get(CLAIM_USER_ID, String.class));
    }

    /**
     * Extracts the role claim from an access token.
     *
     * @param token the raw JWT access token
     * @return the role authority string (e.g., {@code "ROLE_STUDENT"})
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException if the claim is absent or the token is invalid
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get(CLAIM_ROLE, String.class));
    }

    /**
     * Extracts the JWT ID ({@code jti} claim) from a token.
     *
     * <p>The JTI is a UUID assigned to every token at generation time. It is the
     * foundation for token revocation: a denylist service (e.g., backed by Redis)
     * would store revoked JTIs and this method provides the lookup key without
     * requiring the full token string to be stored or compared.
     *
     * @param token the raw JWT string
     * @return the JTI UUID string
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    /**
     * Generic claim extractor that applies a caller-supplied resolver function to the
     * fully-parsed and signature-verified {@link Claims} object.
     *
     * <p>This method is the single parsing entry point for all public claim accessors.
     * Centralising parsing here ensures that exception mapping, logging, and any future
     * instrumentation (e.g., Micrometer metrics on parse latency) apply uniformly to
     * every claim extraction operation, regardless of which claim is being read.
     *
     * <p>Example usage:
     * <pre>{@code
     * // Extract a custom claim named "department"
     * String dept = jwtService.extractClaim(token,
     *         claims -> claims.get("department", String.class));
     * }</pre>
     *
     * @param <T>            the return type of the resolved claim
     * @param token          the raw JWT string
     * @param claimsResolver a {@link Function} that extracts the desired value from
     *                       the verified {@link Claims}; must not be {@code null}
     * @return the resolved claim value; may be {@code null} if the claim is absent
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // =========================================================================
    // TOKEN VALIDATION — PUBLIC API
    // =========================================================================

    /**
     * Performs a full multi-layer validation of an <b>access token</b> against a
     * loaded principal.
     *
     * <p>Validation layers, executed in order:
     * <ol>
     *   <li><b>Cryptographic signature</b> — performed inside {@link #extractAllClaims};
     *       any tampered token fails here.</li>
     *   <li><b>Token type</b> — asserts {@code type == "ACCESS"}; rejects refresh tokens
     *       presented as API credentials.</li>
     *   <li><b>Subject match</b> — the {@code sub} claim must equal the loaded principal's
     *       username; prevents a valid token for user A from being used as user B's identity.</li>
     *   <li><b>Expiration</b> — the token must not have passed its {@code exp} timestamp.</li>
     *   <li><b>Account status</b> — all four Spring Security account flags are evaluated
     *       against the current database state (not the token's embedded claims):
     *       {@code isEnabled()}, {@code isAccountNonExpired()}, {@code isAccountNonLocked()},
     *       and {@code isCredentialsNonExpired()}. Checking all four flags ensures that
     *       administrative actions such as locking, expiring, or disabling an account take
     *       effect immediately, even while a valid token is still in circulation.</li>
     * </ol>
     *
     * <p><b>Issuer verification</b> is performed inside {@link #extractAllClaims} via the
     * JJWT parser's {@code requireIssuer()} constraint, so it is not listed separately.
     *
     * @param token       the raw JWT access token
     * @param userDetails the principal loaded from the database for the token's subject;
     *                    must not be {@code null}
     * @return {@code true} if and only if every validation layer passes
     * @throws JwtTokenExpiredException   if the token has expired (layer 4)
     * @throws JwtAuthenticationException if the signature, type, or structure is invalid
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        log.debug("[JwtService] Validating access token for principal: {}", userDetails.getUsername());

        final String username = extractUsername(token);
        final String tokenType = extractTokenType(token);

        if (!TOKEN_TYPE_ACCESS.equals(tokenType)) {
            log.warn("[JwtService] Access token validation rejected — wrong type: {}", tokenType);
            throw new JwtAuthenticationException(
                    "Invalid token type. Expected ACCESS, received: " + tokenType);
        }

        boolean valid = username.equals(userDetails.getUsername())
                && !isTokenExpired(token)
                && userDetails.isEnabled()
                && userDetails.isAccountNonExpired()
                && userDetails.isAccountNonLocked()
                && userDetails.isCredentialsNonExpired();

        if (!valid) {
            log.warn("[JwtService] Token validation failed for principal: {}", userDetails.getUsername());
        }

        return valid;
    }

    /**
     * Performs a full multi-layer validation of a <b>refresh token</b> against a
     * loaded principal.
     *
     * <p>Follows the same layered approach as {@link #isTokenValid} but asserts
     * {@code type == "REFRESH"} instead. This method is called exclusively by the
     * token-refresh endpoint to verify the presented refresh token before issuing
     * a new access token.
     *
     * @param token       the raw JWT refresh token
     * @param userDetails the principal loaded from the database for the token's subject
     * @return {@code true} if and only if all validation layers pass
     * @throws JwtTokenExpiredException   if the refresh token has expired
     * @throws JwtAuthenticationException if the token is invalid for any other reason
     */
    public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
        log.debug("[JwtService] Validating refresh token for principal: {}", userDetails.getUsername());

        final String username = extractUsername(token);
        final String tokenType = extractTokenType(token);

        if (!TOKEN_TYPE_REFRESH.equals(tokenType)) {
            log.warn("[JwtService] Refresh token validation rejected — wrong type: {}", tokenType);
            throw new JwtAuthenticationException(
                    "Invalid token type. Expected REFRESH, received: " + tokenType);
        }

        return username.equals(userDetails.getUsername())
                && !isTokenExpired(token)
                && userDetails.isEnabled()
                && userDetails.isAccountNonExpired()
                && userDetails.isAccountNonLocked()
                && userDetails.isCredentialsNonExpired();
    }

    /**
     * Returns {@code true} if the token's {@code exp} claim is before the current instant.
     *
     * <p>This check is already included within {@link #isTokenValid}, but is exposed
     * publicly for callers that want to check expiry independently — for example, to
     * provide a more specific "your session has expired, please refresh" message before
     * loading the full {@link UserDetails} from the database.
     *
     * @param token the raw JWT string
     * @return {@code true} if the token has expired; {@code false} if it is still valid
     * @throws JwtAuthenticationException if the token cannot be parsed
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(Date.from(Instant.now()));
    }

    // =========================================================================
    // DOMAIN CONVENIENCE OVERLOADS
    //
    // These two methods allow application-layer services (e.g. AuthService) to
    // pass a domain User directly without constructing a UserDetails manually.
    //
    // Design:
    //   - They extract the three values the primary methods need (email, id, role)
    //     directly from the domain object, build a minimal anonymous UserDetails
    //     implementation inline, and delegate immediately.
    //   - No business logic lives here — purely a bridge between the domain model
    //     and the Spring Security contract.
    //   - The anonymous UserDetails carries only the email (username). The remaining
    //     flag methods return safe defaults that have no effect on token generation
    //     (buildToken only uses the username; flags are only checked during validation).
    // =========================================================================

    /**
     * Convenience overload — generates an access token directly from a domain {@link User}.
     *
     * <p>Bridges the domain model to the primary
     * {@link #generateAccessToken(UserDetails, UUID, Role)} method by extracting
     * email, id, and role from the {@link User} entity and constructing a minimal
     * {@link UserDetails} adapter inline. No other logic is added.
     *
     * @param user the persisted domain user; must not be {@code null},
     *             and must have non-null id, email, and role fields
     * @return a compact, URL-safe, signed JWT access token string
     */
    public String generateAccessToken(User user) {
        UserDetails userDetails = buildMinimalUserDetails(user.getEmail());
        return generateAccessToken(userDetails, user.getId(), user.getRole());
    }

    /**
     * Convenience overload — generates a refresh token directly from a domain {@link User}.
     *
     * <p>Bridges the domain model to the primary
     * {@link #generateRefreshToken(UserDetails, UUID)} method by extracting
     * email and id from the {@link User} entity and constructing a minimal
     * {@link UserDetails} adapter inline. No other logic is added.
     *
     * @param user the persisted domain user; must not be {@code null},
     *             and must have non-null id and email fields
     * @return a compact, URL-safe, signed JWT refresh token string
     */
    public String generateRefreshToken(User user) {
        UserDetails userDetails = buildMinimalUserDetails(user.getEmail());
        return generateRefreshToken(userDetails, user.getId());
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Constructs a minimal, anonymous {@link UserDetails} implementation whose
     * {@code getUsername()} returns the supplied email.
     *
     * <p>All boolean flag methods ({@code isEnabled}, {@code isAccountNonExpired},
     * etc.) return {@code true} as safe defaults. These flags are evaluated only
     * during token <em>validation</em> — never during token <em>generation</em> —
     * so their values here have no effect on the produced token string.
     *
     * @param email the user's email address; used as the {@code sub} claim
     * @return a lightweight {@link UserDetails} adapter
     */
    private UserDetails buildMinimalUserDetails(String email) {
        return new org.springframework.security.core.userdetails.User(
                email,
                "",                                          // password — not used during generation
                List.of(new SimpleGrantedAuthority("USER")) // authority — not embedded by buildToken
        );
    }

    /**
     * Constructs and signs a JWT with the given subject, additional claims, and TTL.
     *
     * <p>This is the single token-building entry point for both access and refresh tokens.
     * Centralising construction here ensures that structural invariants — issuer, JTI,
     * signature algorithm — are applied uniformly and cannot be accidentally omitted by
     * future callers.
     *
     * <p><b>JJWT 0.12.x note:</b> {@code .signWith(signingKey)} without an explicit
     * algorithm argument is the correct 0.12.x idiom. JJWT infers the algorithm from
     * the key type: an HMAC key of 256 bits → HS256. The deprecated
     * {@code .signWith(key, SignatureAlgorithm.HS256)} form must not be used.
     *
     * @param subject      the token subject — the user's email address
     * @param extraClaims  additional claims to embed in the payload
     * @param expirationMs token lifetime in milliseconds from now
     * @return a compact, signed JWT string
     */
    private String buildToken(String subject,
                              Map<String, Object> extraClaims,
                              long expirationMs) {
        Instant now = Instant.now();

        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuer(jwtProperties.getIssuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .id(UUID.randomUUID().toString())   // jti — unique ID per token for revocation support
                .signWith(signingKey)               // JJWT 0.12.x: algorithm inferred from key type
                .compact();
    }

    /**
     * Parses a raw JWT string, verifies its signature and issuer, and returns the
     * embedded {@link Claims} payload.
     *
     * <p>This is the single parse entry point for the entire service. All five major
     * JJWT exception types are caught here and mapped to domain exceptions, ensuring
     * that no JJWT type propagates beyond this class:
     *
     * <table border="1" summary="JJWT exception to domain exception mapping">
     *   <tr><th>JJWT Exception</th><th>Domain Exception</th><th>Meaning</th></tr>
     *   <tr>
     *     <td>{@link ExpiredJwtException}</td>
     *     <td>{@link JwtTokenExpiredException}</td>
     *     <td>Token was valid but has passed its {@code exp} timestamp.
     *         Client should attempt a silent refresh.</td>
     *   </tr>
     *   <tr>
     *     <td>{@link SignatureException}</td>
     *     <td>{@link JwtAuthenticationException}</td>
     *     <td>Signature verification failed — possible token tampering.</td>
     *   </tr>
     *   <tr>
     *     <td>{@link MalformedJwtException}</td>
     *     <td>{@link JwtAuthenticationException}</td>
     *     <td>Token is not a structurally valid JWT.</td>
     *   </tr>
     *   <tr>
     *     <td>{@link UnsupportedJwtException}</td>
     *     <td>{@link JwtAuthenticationException}</td>
     *     <td>Token type not supported by this parser (e.g., unsigned JWT).</td>
     *   </tr>
     *   <tr>
     *     <td>{@link SecurityException}</td>
     *     <td>{@link JwtAuthenticationException}</td>
     *     <td>General JWT security exception (base type of SignatureException in 0.12.x).</td>
     *   </tr>
     *   <tr>
     *     <td>{@link IllegalArgumentException}</td>
     *     <td>{@link JwtAuthenticationException}</td>
     *     <td>Token string is {@code null}, empty, or whitespace-only.</td>
     *   </tr>
     * </table>
     *
     * <p><b>Issuer verification:</b> The parser is configured with
     * {@code .requireIssuer(jwtProperties.getIssuer())}. JJWT will throw a
     * {@link io.jsonwebtoken.IncorrectClaimException} (a subtype of {@link JwtException})
     * if the {@code iss} claim does not match, which is caught by the {@code JwtException}
     * catch block and mapped to {@link JwtAuthenticationException}.
     *
     * @param token the raw JWT string; must not be {@code null} or blank
     * @return the verified {@link Claims} payload
     * @throws JwtTokenExpiredException   if the token has expired
     * @throws JwtAuthenticationException for any other parse or verification failure
     */
    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(jwtProperties.getIssuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

        } catch (ExpiredJwtException ex) {
            log.warn("[JwtService] Token expired. JTI: {}", safeGetJti(ex.getClaims()));
            throw new JwtTokenExpiredException(
                    "JWT token has expired. Please refresh your session.", ex);

        } catch (SignatureException ex) {
            log.error("[JwtService] JWT signature verification failed — possible tampering detected");
            throw new JwtAuthenticationException(
                    "JWT signature is invalid. The token may have been tampered with.", ex);

        } catch (MalformedJwtException ex) {
            log.error("[JwtService] Malformed JWT received");
            throw new JwtAuthenticationException(
                    "JWT is malformed and could not be parsed.", ex);

        } catch (UnsupportedJwtException ex) {
            log.error("[JwtService] Unsupported JWT format received");
            throw new JwtAuthenticationException(
                    "JWT format is not supported by this server.", ex);

        } catch (SecurityException ex) {
            log.error("[JwtService] JWT security exception: {}", ex.getMessage());
            throw new JwtAuthenticationException(
                    "A JWT security error occurred during token verification.", ex);

        } catch (JwtException ex) {
            // Catches IncorrectClaimException (issuer mismatch), MissingClaimException,
            // and any other JwtException subtypes not handled explicitly above.
            log.error("[JwtService] JWT validation failed: {}", ex.getMessage());
            throw new JwtAuthenticationException(
                    "JWT validation failed: " + ex.getMessage(), ex);

        } catch (IllegalArgumentException ex) {
            log.error("[JwtService] JWT token string is null, empty, or whitespace-only");
            throw new JwtAuthenticationException(
                    "JWT token must not be null or blank.", ex);
        }
    }

    /**
     * Safely extracts the {@code jti} from a {@link Claims} object that was recovered
     * from an {@link ExpiredJwtException}.
     *
     * <p>JJWT populates the claims object even for expired tokens so that the caller
     * can inspect them. This helper is used exclusively in warning log messages so that
     * expired tokens remain traceable in the audit log by their JTI without requiring
     * the full token string to be logged.
     *
     * @param claims the claims recovered from the {@link ExpiredJwtException}; may be {@code null}
     * @return the JTI string, or {@code "unknown"} if the claims object is null or the claim is absent
     */
    private String safeGetJti(Claims claims) {
        try {
            return (claims != null && claims.getId() != null) ? claims.getId() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}