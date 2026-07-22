package com.smartcampus.erp.infrastructure.security.jwt;

import com.smartcampus.erp.infrastructure.security.jwt.exception.JwtAuthenticationException;
import com.smartcampus.erp.infrastructure.security.jwt.exception.JwtTokenExpiredException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Stateless JWT authentication filter that intercepts every incoming HTTP request
 * exactly once and, when a valid Bearer token is present, populates the
 * {@link SecurityContextHolder} with the authenticated principal.
 *
 * <h2>Position in the Security Pipeline</h2>
 * <p>
 * Spring Security processes each request through an ordered chain of servlet filters.
 * This filter is registered <em>before</em> {@code UsernamePasswordAuthenticationFilter}
 * in {@code SecurityConfig}. Its sole job is to convert a raw Bearer token from the
 * {@code Authorization} header into a fully-populated
 * {@link UsernamePasswordAuthenticationToken} that downstream filters and controllers
 * can trust without re-authenticating.
 * </p>
 *
 * <h2>Why {@link OncePerRequestFilter}?</h2>
 * <p>
 * The servlet specification allows a single logical HTTP request to be dispatched
 * multiple times internally (e.g., via {@code RequestDispatcher.forward()} or error
 * handling). A plain {@link jakarta.servlet.Filter} would execute on each dispatch,
 * risking double authentication and potential corruption of the
 * {@link SecurityContextHolder}. {@link OncePerRequestFilter} uses a per-request
 * attribute to guarantee that {@link #doFilterInternal} is called at most once per
 * external client request, regardless of internal server-side dispatching.
 * </p>
 *
 * <h2>Stateless Design</h2>
 * <p>
 * No HTTP session is created or consulted. The principal is reconstructed from the
 * token on every request. This is the correct pattern for REST APIs consumed by
 * SPAs, mobile clients, or external systems, and it aligns with the
 * {@code SessionCreationPolicy.STATELESS} setting in {@code SecurityConfig}.
 * </p>
 *
 * <h2>Request Flow</h2>
 * <pre>
 *   Incoming HTTP request
 *     │
 *     ├─ No "Authorization: Bearer ..." header?
 *     │      → skip authentication, continue filter chain
 *     │        (Spring Security will reject unauthenticated access to protected
 *     │         endpoints via its own AuthenticationEntryPoint)
 *     │
 *     ├─ SecurityContext already contains an Authentication?
 *     │      → skip (do not override a higher-trust mechanism already in place)
 *     │
 *     ├─ Token expired?
 *     │      → write 401 JSON: { errorCode: "TOKEN_EXPIRED" }, stop chain
 *     │
 *     ├─ Token invalid / tampered / malformed?
 *     │      → write 401 JSON: { errorCode: "INVALID_TOKEN" }, stop chain
 *     │
 *     ├─ User not found in database?
 *     │      → write 401 JSON: { errorCode: "USER_NOT_FOUND" }, stop chain
 *     │
 *     ├─ Token fails validation against loaded principal?
 *     │      → write 401 JSON: { errorCode: "INVALID_TOKEN" }, stop chain
 *     │
 *     └─ All checks pass?
 *            → populate SecurityContextHolder, continue filter chain
 * </pre>
 *
 * <h2>Error Response Strategy</h2>
 * <p>
 * Exceptions thrown <em>inside</em> a servlet filter do <b>not</b> pass through
 * Spring Security's {@code ExceptionTranslationFilter}. They bubble up to the servlet
 * container, which would normally produce an unstructured HTML or plain-text error page
 * — unacceptable for a JSON API. This filter catches all authentication-related
 * exceptions locally and writes a structured JSON error body directly to the
 * {@link HttpServletResponse}, keeping the error format consistent with responses
 * produced by the global {@code @RestControllerAdvice}.
 * </p>
 *
 * <h2>Security Invariants</h2>
 * <ul>
 *   <li>Raw token strings are <em>never</em> written to any log at any level.</li>
 *   <li>Stack traces are <em>never</em> exposed in client-facing responses.</li>
 *   <li>The {@link UsernamePasswordAuthenticationToken} stored in the context
 *       always has {@code credentials} set to {@code null}: in a stateless JWT flow,
 *       the token is the credential; retaining it in the context would risk
 *       accidental serialisation or logging downstream.</li>
 *   <li>A DB lookup is performed on every request (via {@link UserDetailsService})
 *       to ensure that disabled, locked, or deleted accounts are rejected immediately
 *       even while a structurally valid token is still in circulation.</li>
 * </ul>
 *
 * @author  Smart Campus ERP Engineering
 * @version 1.0.0
 * @since   2025
 * @see     JwtService
 * @see     JwtAuthenticationException
 * @see     JwtTokenExpiredException
 */
@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /**
     * The prefix that RFC 6750 mandates for Bearer token transmission in the
     * {@code Authorization} header: {@code "Bearer "} (note the trailing space).
     * Defined as a constant to avoid scattered magic-string literals.
     */
    private static final String BEARER_PREFIX = "Bearer ";

    /**
     * Pre-computed length of {@value #BEARER_PREFIX}, used for O(1) token extraction
     * via {@link String#substring(int)} without recomputing on every request.
     */
    private static final int BEARER_PREFIX_LENGTH = BEARER_PREFIX.length();

    // -------------------------------------------------------------------------
    // Dependencies
    // -------------------------------------------------------------------------

    /**
     * Service responsible for all JWT cryptographic operations: token parsing,
     * claim extraction, signature verification, and validity checks.
     *
     * <p>Declared as the concrete type {@link JwtService} rather than an interface
     * because this application has a single JWT implementation and introducing an
     * interface solely for this dependency would add abstraction without value.
     * If a second implementation becomes necessary, the interface can be extracted
     * at that point without changing this filter's public contract.
     */
    private final JwtService jwtService;

    /**
     * Loads a {@link UserDetails} instance for a given username (email) from
     * the persistence layer.
     *
     * <p>Declared against the {@link UserDetailsService} interface rather than
     * {@code CustomUserDetailsService} directly to honour the Dependency Inversion
     * Principle and keep this filter independently testable with a mock implementation.
     */
    private final UserDetailsService userDetailsService;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * Constructs the filter with its required collaborators.
     *
     * <p>Constructor injection is mandated throughout this codebase. It makes
     * the dependency graph explicit at compile time, supports final fields,
     * and allows instantiation in unit tests without a Spring application context.
     *
     * @param jwtService         the JWT service for token operations; must not be {@code null}
     * @param userDetailsService the service for loading user principals; must not be {@code null}
     */
    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    // =========================================================================
    // CORE FILTER LOGIC
    // =========================================================================

    /**
     * Executes the JWT authentication logic for a single HTTP request.
     *
     * <p>The method is structured around early-return guards to keep nesting depth
     * minimal and the happy path readable. Each guard has a single, clearly-stated
     * reason for skipping authentication; all other cases proceed to full validation.
     *
     * <p><b>Guard 1 — No Bearer token:</b><br>
     * If the {@code Authorization} header is absent or does not start with
     * {@code "Bearer "}, authentication is skipped entirely. Spring Security's
     * {@code AuthenticationEntryPoint} will reject unauthenticated access to
     * protected endpoints downstream; this filter does not need to produce that
     * rejection itself.
     *
     * <p><b>Guard 2 — Context already authenticated:</b><br>
     * If the {@link SecurityContextHolder} already holds an
     * {@link org.springframework.security.core.Authentication} object, a prior
     * filter or mechanism has already authenticated the request. Overriding it
     * here could downgrade a higher-trust authentication, so this filter passes
     * the request through unchanged.
     *
     * @param request     the incoming HTTP request; never {@code null}
     * @param response    the HTTP response, written to directly on authentication failure;
     *                    never {@code null}
     * @param filterChain the remaining filter chain; never {@code null}
     * @throws ServletException if a downstream filter in the chain throws a servlet error
     * @throws IOException      if writing the error response to the output stream fails
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // ── Guard 1: skip if no Bearer token is present ───────────────────────
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith(BEARER_PREFIX)) {
            log.trace("[JwtFilter] No Bearer token on request to '{}' — skipping JWT authentication",
                    request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(BEARER_PREFIX_LENGTH);

        try {
            final String username = jwtService.extractUsername(jwt);

            // ── Guard 2: skip if SecurityContext already holds an Authentication ──
            if (!StringUtils.hasText(username)
                    || SecurityContextHolder.getContext().getAuthentication() != null) {
                log.trace("[JwtFilter] SecurityContext already populated for '{}' — skipping",
                        username);
                filterChain.doFilter(request, response);
                return;
            }

            authenticateRequest(jwt, username, request);

        } catch (JwtTokenExpiredException ex) {
            log.warn("[JwtFilter] Expired JWT on '{}': {}", request.getRequestURI(), ex.getMessage());
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED",
                    "Your session has expired. Please refresh your token and try again.");
            return;

        } catch (JwtAuthenticationException ex) {
            log.warn("[JwtFilter] Invalid JWT on '{}': {}", request.getRequestURI(), ex.getMessage());
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "INVALID_TOKEN",
                    "Authentication failed. The provided token is invalid.");
            return;

        } catch (UsernameNotFoundException ex) {
            log.warn("[JwtFilter] Token subject not found in user store — possible stale token: {}",
                    ex.getMessage());
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND",
                    "The user associated with this token no longer exists.");
            return;

        } catch (Exception ex) {
            // Defensive catch-all: any unexpected runtime failure during authentication
            // must never propagate as an HTTP 500. It is treated as an authentication
            // failure and logged at ERROR level so that operations can investigate.
            log.error("[JwtFilter] Unexpected error authenticating request to '{}': {}",
                    request.getRequestURI(), ex.getMessage(), ex);
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR",
                    "Authentication could not be completed. Please try again.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Loads the user principal, validates the token against it, and — if all
     * checks pass — creates and stores a fully-populated
     * {@link UsernamePasswordAuthenticationToken} in the {@link SecurityContextHolder}.
     *
     * <p>This method is intentionally extracted from {@link #doFilterInternal} for
     * two reasons:
     * <ol>
     *   <li>It reduces the cognitive load of the outer method, keeping exception
     *       handling and authentication logic in separate, focused blocks.</li>
     *   <li>It is independently unit-testable without exercising the full filter
     *       lifecycle ({@code doFilterInternal} → chain → response writing).</li>
     * </ol>
     *
     * <p><b>Why load the user from the database on every request?</b><br>
     * The token's embedded claims (role, enabled state) reflect the moment the
     * token was issued, not the current state. Loading the principal on every
     * request ensures that administrative actions — disabling an account, locking
     * a user, revoking a role — take effect immediately, without waiting for
     * the token to expire.
     *
     * <p><b>Why set credentials to {@code null}?</b><br>
     * In a stateless JWT flow, the raw token is the credential. Storing it in the
     * {@link SecurityContextHolder} would risk accidental logging or serialisation
     * by downstream components. Setting credentials to {@code null} is the standard
     * Spring Security pattern for token-based authentication.
     *
     * <p><b>Why attach {@link WebAuthenticationDetailsSource} details?</b><br>
     * Web details (remote IP address, session ID) are attached to the authentication
     * object so that audit log entries and intrusion-detection rules can correlate
     * successful authentications with network-level metadata, without coupling domain
     * code to servlet APIs.
     *
     * @param jwt      the raw JWT string already extracted from the {@code Authorization} header
     * @param username the subject claim already extracted from the token
     * @param request  the current HTTP request, used to build authentication details
     * @throws UsernameNotFoundException  if no user exists for the given username
     * @throws JwtAuthenticationException if the token fails validation against the loaded principal
     */
    private void authenticateRequest(
            String jwt,
            String username,
            HttpServletRequest request
    ) {
        log.debug("[JwtFilter] Attempting JWT authentication for principal: '{}'", username);

        final UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        if (!jwtService.isTokenValid(jwt, userDetails)) {
            log.warn("[JwtFilter] Token is structurally valid but failed principal validation for: '{}'",
                    username);
            throw new JwtAuthenticationException(
                    "Token validation failed for principal: " + username);
        }

        final UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,                         // credentials null by design — see JavaDoc
                        userDetails.getAuthorities()
                );

        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContextHolder.getContext().setAuthentication(authToken);

        log.debug("[JwtFilter] Successfully authenticated principal: '{}' with authorities: {}",
                username, userDetails.getAuthorities());
    }

    /**
     * Writes a structured JSON error body directly to the {@link HttpServletResponse}
     * and sets the appropriate HTTP status code and content type.
     *
     * <p><b>Why write the response here instead of throwing and letting Spring handle it?</b><br>
     * Exceptions thrown from inside a {@link OncePerRequestFilter} bypass Spring Security's
     * {@code ExceptionTranslationFilter} entirely. They propagate to the servlet container,
     * which typically renders an HTML error page or an unformatted container-specific JSON
     * body — neither of which is appropriate for an API. By writing the response directly,
     * this filter ensures that authentication error bodies are structurally identical to
     * the application-level error responses produced by the global
     * {@code @RestControllerAdvice}, providing a consistent client experience.
     *
     * <p><b>JSON construction:</b><br>
     * The JSON body is built with string formatting rather than an {@code ObjectMapper}
     * to avoid introducing a Jackson dependency into this filter. The {@link #sanitise}
     * method escapes the two characters that could break the literal JSON string.
     *
     * @param response  the HTTP response to write to; must not be committed
     * @param status    the HTTP status to set (typically {@link HttpStatus#UNAUTHORIZED})
     * @param errorCode a short, machine-readable error discriminator
     *                  (e.g., {@code "TOKEN_EXPIRED"}, {@code "INVALID_TOKEN"})
     * @param message   a human-readable description safe for client consumption;
     *                  must not contain stack traces or internal system details
     * @throws IOException if writing to the response output stream fails
     */
    private void writeErrorResponse(
            HttpServletResponse response,
            HttpStatus status,
            String errorCode,
            String message
    ) throws IOException {

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        final String body = String.format(
                "{\"success\":false,\"status\":%d,\"errorCode\":\"%s\",\"message\":\"%s\"}",
                status.value(),
                sanitise(errorCode),
                sanitise(message)
        );

        response.getWriter().write(body);
        response.getWriter().flush();
    }

    /**
     * Sanitises a string for safe embedding within a manually-constructed JSON string
     * literal by escaping backslashes and double-quote characters.
     *
     * <p>This is a deliberately narrow escaping routine. It addresses only the two
     * characters that can break the hand-written JSON literal produced by
     * {@link #writeErrorResponse}. It is <b>not</b> a general-purpose JSON encoder;
     * for arbitrary value serialisation, use {@code ObjectMapper}.
     *
     * @param value the raw string to sanitise; {@code null} is handled gracefully
     * @return the escaped string, safe for placement between JSON double-quote delimiters;
     *         an empty string if the input is {@code null}
     */
    private String sanitise(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}