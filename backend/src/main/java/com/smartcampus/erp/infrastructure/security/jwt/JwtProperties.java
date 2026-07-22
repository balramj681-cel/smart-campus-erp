package com.smartcampus.erp.infrastructure.security.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * Strongly typed, validated binding of every JWT-related setting under the
 * {@code security.jwt.*} prefix in {@code application.yml}.
 *
 * <h2>Why {@code @ConfigurationProperties} is better than scattered {@code @Value} annotations</h2>
 * {@code @Value("${security.jwt.secret}")} sprinkled across {@code JwtService},
 * a JWT filter, and possibly a token-refresh endpoint means the same
 * property key gets duplicated as a raw string literal in every place that
 * needs it — a typo in any one of those literals (e.g.
 * {@code "security.jwt.secrett"}) doesn't fail to compile, it just silently
 * injects an empty value, often only discovered the first time a token
 * needs signing in production. {@code @ConfigurationProperties} instead
 * binds an entire prefixed group of configuration keys to one type-safe
 * Java object exactly once. Every consumer injects this single class and
 * gets compile-time-checked field access — {@code jwtProperties.getSecret()}
 * is a real Java reference the IDE can autocomplete and safely
 * rename-refactor, not a string that merely has to match a YAML key by
 * convention. Combined with {@code @Validated} below, it also means the
 * application refuses to start at all if a required JWT setting is missing
 * — failing fast at boot, rather than failing mysteriously on the first
 * login attempt.
 *
 * <h2>Why JWT configuration should be centralized</h2>
 * Token lifetime, signing secret, and issuer have to stay perfectly
 * consistent across every class that touches a token: the future
 * {@code JwtService} that creates them, the JWT filter that validates them
 * on every request, and any future token-refresh endpoint. If each class
 * independently read its own copy of these settings, drift between them —
 * one class using a different expiration than another, for instance —
 * becomes a real and easy-to-miss bug. A single injected class, used
 * everywhere JWT settings are needed, is the one source of truth that
 * makes that class of bug structurally impossible.
 *
 * <h2>Access token vs. refresh token</h2>
 * An <b>access token</b> is short-lived (typically minutes) and is
 * attached to every authenticated API request as proof of identity; its
 * short lifespan limits the damage if it's ever intercepted, since it
 * expires on its own regardless of whether the user explicitly logs out.
 * A <b>refresh token</b> is long-lived (typically days) and has exactly
 * one job — being exchanged for a brand-new access token once the current
 * one expires, without forcing the user to re-enter their password.
 * Separating the two lets "is this request currently authorized" stay
 * cheap and short-lived while still offering a long-lived session
 * experience; it also means a compromised access token only grants a
 * brief window of access, whereas a compromised refresh token is the more
 * serious risk and should eventually be handled with extra care (e.g. an
 * {@code httpOnly} cookie rather than client-side storage).
 *
 * <h2>Why the secret should never be hardcoded</h2>
 * The signing secret is the single piece of data that proves a token was
 * actually issued by this application — anyone who obtains it can forge a
 * token claiming to be any user, including an admin, without ever touching
 * the database or a password. Hardcoding it in source code means it lives
 * in version control history permanently (recoverable even after later
 * removal), is visible to anyone with repository read access, and is
 * identical across every environment unless someone remembers to override
 * it — the exact opposite of how a secret should behave. Binding it from
 * external configuration (an environment variable, a secrets manager, or
 * an {@code application-prod.yml} deliberately excluded from version
 * control) lets it differ per environment and ensures it never needs to
 * touch the codebase at all.
 *
 * <h2>Why {@code issuer} exists</h2>
 * The {@code iss} (issuer) claim identifies which system actually created
 * a given token. It serves as a defense-in-depth sanity check during
 * verification — a token can be rejected for having the wrong issuer even
 * if its signature happens to validate — and becomes more important as the
 * system grows: if this ERP ever issues tokens from more than one source
 * (a separate mobile auth flow, or the future Python/FastAPI ML service),
 * the issuer claim is what lets a verifier tell "issued by our main API"
 * apart from "issued by something else," even within the same overall
 * trust boundary.
 *
 * <h2>How this will be injected into {@code JwtService}</h2>
 * Once built, {@code JwtService} will receive this class via constructor
 * injection, consistent with every other class in this codebase —
 * {@code private final JwtProperties jwtProperties;} — and use
 * {@link #getSecret()} to sign and verify tokens,
 * {@link #getAccessTokenExpiration()} / {@link #getRefreshTokenExpiration()}
 * to set each token type's expiry claim, and {@link #getIssuer()} to
 * populate the {@code iss} claim on every token it creates. Because
 * {@code JwtService} will depend on this typed class rather than reading
 * raw properties itself, it stays fully decoupled from how or where these
 * values are actually configured.
 *
 * <p><b>Registration note:</b> a {@code @ConfigurationProperties} class is
 * not automatically a Spring bean by itself — it needs either
 * {@code @ConfigurationPropertiesScan} on the main application class, or
 * an explicit {@code @EnableConfigurationProperties(JwtProperties.class)}
 * on a {@code @Configuration} class, before it can be injected anywhere.
 * That wiring is intentionally left for whichever file introduces it.</p>
 *
 * <p><b>Expected {@code application.yml} shape:</b></p>
 * <pre>{@code
 * security:
 *   jwt:
 *     secret: ${JWT_SECRET}
 *     issuer: smart-campus-erp
 *     access-token-expiration: 900000      # 15 minutes, in milliseconds
 *     refresh-token-expiration: 604800000  # 7 days, in milliseconds
 * }</pre>
 *
 * @author Smart Campus ERP Engineering
 */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "security.jwt")
public class JwtProperties {

    /**
     * The key used to sign and verify JWTs. Must be supplied via external
     * configuration (environment variable, secrets manager) — see
     * class-level Javadoc for why this is never hardcoded.
     */
    @NotBlank
    private String secret;

    /**
     * How long an access token remains valid, in milliseconds, before a
     * client must use a refresh token to obtain a new one.
     */
    @Positive
    private long accessTokenExpiration;

    /**
     * How long a refresh token remains valid, in milliseconds, before the
     * user must authenticate with their credentials again.
     */
    @Positive
    private long refreshTokenExpiration;

    /**
     * The value written to the {@code iss} (issuer) claim on every token
     * this application creates.
     */
    @NotBlank
    private String issuer;
}