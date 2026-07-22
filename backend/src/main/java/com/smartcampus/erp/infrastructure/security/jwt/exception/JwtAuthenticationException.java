package com.smartcampus.erp.infrastructure.security.jwt.exception;

/**
 * Domain exception representing a general JWT authentication failure within the
 * Smart Campus ERP security infrastructure.
 *
 * <p><b>Why this class exists:</b><br>
 * JJWT 0.12.x throws a hierarchy of library-specific runtime exceptions
 * ({@code MalformedJwtException}, {@code SignatureException}, {@code UnsupportedJwtException},
 * etc.). Allowing those types to propagate beyond {@code JwtService} would couple every
 * layer of the application directly to the JJWT library internals. Wrapping them in this
 * domain exception achieves three goals:
 * <ul>
 *   <li><b>Library independence</b> – A future migration from JJWT to another library
 *       (e.g. Nimbus JOSE+JWT) requires changes only inside {@code JwtService}, not in
 *       every caller or exception handler.</li>
 *   <li><b>Stable handler target</b> – The global {@code @RestControllerAdvice} can catch
 *       this single type and map it to an HTTP 401 response without importing JJWT classes.</li>
 *   <li><b>Semantic clarity</b> – Any class in the codebase that catches this exception
 *       immediately understands the intent: a JWT-level authentication failure occurred.</li>
 * </ul>
 *
 * <p><b>Exception hierarchy:</b><br>
 * This is the base exception for all JWT-related failures. The more specific
 * {@link JwtTokenExpiredException} extends it, allowing callers to distinguish between
 * "token is expired (suggest refresh)" and "token is invalid (force re-login)" without
 * fragile string-based comparison.
 *
 * <p><b>Usage contract:</b><br>
 * Messages passed to this exception must be safe to include in API error responses and
 * log entries. They must <em>never</em> contain the raw token string, user passwords,
 * or any other credential material.
 *
 * @author  Smart Campus ERP Engineering
 * @version 1.0.0
 * @since   2025
 * @see     JwtTokenExpiredException
 */
public class JwtAuthenticationException extends RuntimeException {

    /**
     * Constructs an exception with a descriptive human-readable message.
     *
     * <p>Use this constructor when the failure does not originate from a lower-level
     * library exception — for example, when a business-level assertion fails
     * (issuer mismatch, token type mismatch, subject mismatch).
     *
     * @param message a human-readable explanation of the authentication failure;
     *                must not contain raw credential material
     */
    public JwtAuthenticationException(String message) {
        super(message);
    }

    /**
     * Constructs an exception wrapping a lower-level cause.
     *
     * <p>Use this constructor when mapping a library-specific exception (e.g., a JJWT
     * {@code SignatureException} or {@code MalformedJwtException}) to this domain type.
     * Preserving the cause ensures that the full exception chain remains visible in
     * log output, which is critical for production debugging and security auditing.
     *
     * @param message a human-readable explanation of the authentication failure;
     *                must not contain raw credential material
     * @param cause   the originating exception from the JWT library or another subsystem
     */
    public JwtAuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
}