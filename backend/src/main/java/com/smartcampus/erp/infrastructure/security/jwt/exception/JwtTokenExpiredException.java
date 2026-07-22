package com.smartcampus.erp.infrastructure.security.jwt.exception;

/**
 * Typed domain exception signalling that a JWT has passed its expiration timestamp.
 *
 * <p><b>Why a separate subtype?</b><br>
 * An expired token is semantically different from a tampered or structurally broken one:
 * <ul>
 *   <li>The token was legitimately issued by this system and its claims are structurally valid.</li>
 *   <li>The correct client response is typically "silently attempt a token refresh" rather
 *       than "your credentials are invalid — please log in again".</li>
 *   <li>The HTTP status remains 401, but the response body can carry a machine-readable
 *       {@code TOKEN_EXPIRED} error code so the frontend can distinguish the two cases
 *       without parsing the human-readable message string.</li>
 * </ul>
 *
 * <p><b>Exception hierarchy:</b><br>
 * This class extends {@link JwtAuthenticationException}, so a catch block targeting the
 * base type will still catch expired-token errors. Callers that need finer-grained handling
 * should catch this subtype first:
 * <pre>{@code
 * catch (JwtTokenExpiredException ex) {
 *     // 401 with errorCode "TOKEN_EXPIRED" → client should attempt refresh
 * } catch (JwtAuthenticationException ex) {
 *     // 401 with errorCode "INVALID_TOKEN"  → client should force re-login
 * }
 * }</pre>
 *
 * <p><b>Usage contract:</b><br>
 * This exception is thrown exclusively from {@code JwtService.extractAllClaims()} when
 * JJWT raises an {@code io.jsonwebtoken.ExpiredJwtException}. It must not be constructed
 * in any other location to keep the mapping between library exception and domain exception
 * a single, auditable point of control.
 *
 * @author  Smart Campus ERP Engineering
 * @version 1.0.0
 * @since   2025
 * @see     JwtAuthenticationException
 */
public class JwtTokenExpiredException extends JwtAuthenticationException {

    /**
     * Constructs the exception with a user-facing message and the originating cause.
     *
     * <p>The cause is always the JJWT {@code ExpiredJwtException} and must be preserved
     * so that the full stack trace — including the token's expiry timestamp embedded in
     * the JJWT exception message — remains available in the log output for audit purposes.
     *
     * @param message a human-readable explanation suitable for an API error response
     *                (e.g., {@code "JWT token has expired. Please refresh your session."});
     *                must not contain raw credential material
     * @param cause   the underlying {@code io.jsonwebtoken.ExpiredJwtException}
     */
    public JwtTokenExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}