package com.smartcampus.erp.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.smartcampus.erp.infrastructure.security.jwt.JwtAuthenticationFilter;
import com.smartcampus.erp.infrastructure.security.userdetails.CustomUserDetailsService;

import lombok.RequiredArgsConstructor;

/**
 * Core Spring Security configuration for the Smart Campus ERP API.
 *
 * <h2>What this class deliberately does NOT do yet</h2>
 * It does not register a JWT authentication filter, a
 * {@code UserDetailsService}, or an {@code AuthenticationProvider}. Those
 * arrive in subsequent files once the Auth module's persistence layer exists.
 * Until then, this configuration defines the *shape* of the security posture
 * (what's public, what's protected, how sessions behave) without yet wiring
 * *how* a request actually gets authenticated. This is intentional, incremental
 * delivery — not an oversight.
 *
 * <h2>Decision: {@code @EnableWebSecurity}</h2>
 * Spring Boot auto-configures a permissive-by-default security setup the moment
 * {@code spring-boot-starter-security} is on the classpath.
 * {@code @EnableWebSecurity} signals that we are taking explicit ownership of
 * the security configuration via our own {@link SecurityFilterChain} bean
 * instead of relying on Boot's defaults.
 *
 * <h2>Decision: CSRF is disabled</h2>
 * CSRF (Cross-Site Request Forgery) protection exists to defend
 * <b>cookie/session-based</b> authentication, where a browser automatically
 * attaches ambient credentials to every request regardless of which site
 * initiated it. This API uses stateless JWT bearer tokens sent explicitly in
 * the {@code Authorization} header by the client — there is no ambient
 * credential for a malicious site to silently ride along with, so CSRF
 * protection provides no benefit here and would only add friction.
 * <b>Caveat worth keeping in mind:</b> if a future iteration stores the refresh
 * token in an {@code httpOnly} cookie instead of the access token being purely
 * header-based, CSRF protection must be reinstated for that cookie-backed
 * endpoint specifically.
 *
 * <h2>Decision: CORS is enabled</h2>
 * The React frontend (Vite dev server, a separate Spring Boot deployment in
 * production) runs on a different origin than this API. Browsers block
 * cross-origin requests by default, so an explicit
 * {@link CorsConfigurationSource} is required for the frontend to be able to
 * call this API at all. It's defined as its own bean
 * ({@link #corsConfigurationSource()}) rather than inline, so
 * {@code .cors(Customizer.withDefaults())} can simply discover it from the
 * application context — keeping the CORS *policy* (allowed origins, methods,
 * headers) separate from the *act* of enabling CORS in the filter chain.
 *
 * <h2>Decision: {@code SessionCreationPolicy.STATELESS}</h2>
 * JWT authentication is, by design, self-contained — every request carries its
 * own proof of identity in the token, so the server never needs to remember a
 * session between requests. Declaring the session policy {@code STATELESS}
 * tells Spring Security to never create or read an {@code HttpSession} for
 * authentication purposes. This is what allows the API to scale horizontally
 * behind a load balancer with zero session replication or sticky-session
 * configuration.
 *
 * <h2>Decision: the public endpoint allow-list</h2>
 * <ul>
 * <li>{@code /api/auth/**} — login, registration, and token-refresh must be
 * reachable by definition <i>before</i> a client has a token.</li>
 * <li>{@code /actuator/health} — load balancers, container orchestrators
 * (Kubernetes liveness/readiness probes), and uptime monitors need to check
 * service health without holding a credential.</li>
 * <li>{@code /swagger-ui/**} and {@code /v3/api-docs/**} — interactive API
 * documentation, useful during development and for other teams integrating
 * against this API. (Worth revisiting before a public production launch — many
 * organizations restrict or disable Swagger UI outside of internal/staging
 * environments.)</li>
 * </ul>
 * Every other endpoint falls through to {@code anyRequest().authenticated()} —
 * a deliberate default-deny posture. New endpoints are protected automatically
 * the moment they're added; a developer has to *opt in* to public access by
 * extending the allow-list, rather than accidentally shipping an unprotected
 * endpoint.
 *
 * <h2>Decision: exposing {@code AuthenticationManager} via
 * {@code AuthenticationConfiguration}</h2>
 * This is the Spring Boot 3 / Spring Security 6 replacement for the deprecated
 * {@code WebSecurityConfigurerAdapter#authenticationManagerBean()} approach.
 * Delegating to {@link AuthenticationConfiguration} lets Spring assemble the
 * {@code AuthenticationManager} from whatever
 * {@code AuthenticationProvider}/{@code UserDetailsService} beans exist in the
 * context — which today is Boot's auto-configured default, and will
 * transparently become our own {@code DaoAuthenticationProvider} the moment
 * it's introduced, with <b>no change required to this file</b>. The Auth
 * module's login use case will inject this bean to verify username/password
 * credentials before issuing a JWT.
 *
 * <h2>Decision: {@code PasswordEncoder} is injected now</h2>
 * It isn't referenced inside {@link #securityFilterChain(HttpSecurity)} today —
 * there's no {@code AuthenticationProvider} yet for it to plug into. It's wired
 * in via constructor injection ahead of that, so that when the
 * {@code UserDetailsService} and {@code AuthenticationProvider} land in an
 * upcoming file, they can be added to *this* class without touching its
 * constructor or dependency graph again. (An IDE may flag the field as
 * temporarily unused — that's expected and self-resolves once the provider bean
 * is added.)
 *
 * @author Smart Campus ERP Engineering
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /**
     * Endpoints reachable without an authenticated principal. Every path not
     * listed here requires a valid authentication via
     * {@code anyRequest().authenticated()} below.
     */
    /*
    private static final String[] PUBLIC_ENDPOINTS = {
        "/api/auth/**",
        "/actuator/health",
        "/swagger-ui/**",
        "/v3/api-docs/**"
    };
     */
    private static final String[] PUBLIC_ENDPOINTS = {
        "/api/auth/**",
        "/actuator/health",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api/profile/photo/**",
        "/ws/**"
    };

    /**
     * Reserved for the {@code AuthenticationProvider
     * introduced a
     * the class-level
     */
    private final PasswordEncoder passwordEncoder;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService customUserDetailsService;

    /**
     * Defines the HTTP security filter chain: which endpoints are public, how
     * sessions are (not) managed, and how CSRF/CORS are handled.
     *
     * @param http the {@link HttpSecurity} builder provided by Spring Security
     * @return the assembled {@link SecurityFilterChain}
     * @throws Exception propagated from the underlying {@code HttpSecurity}
     * builder API
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Stateless JWT API: no ambient cookie credential for CSRF to exploit.
                .csrf(AbstractHttpConfigurer::disable)
                // Discovers the CorsConfigurationSource bean defined below.
                .cors(Customizer.withDefaults())
                // No HttpSession is created or used for authentication state.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    /**
     * Exposes the {@link AuthenticationManager} as a bean so it can be injected
     * into the Auth module's login use case to verify submitted credentials.
     * See the class-level Javadoc for why {@link AuthenticationConfiguration}
     * is the correct source for this in Spring Boot 3 / Spring Security 6.
     *
     * @param authenticationConfiguration supplied by Spring Security
     * @return the application's {@link AuthenticationManager}
     * @throws Exception propagated from the underlying configuration API
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();

        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Defines the CORS policy permitting the React frontend's origin to call
     * this API from the browser.
     *
     * <p>
     * <b>TODO (Configuration Externalization):</b> the allowed origin(s) below
     * are hardcoded for local development against the Vite dev server. Before
     * any non-local deployment, externalize this to {@code application.yml}
     * (e.g. a {@code cors.allowed-origins} property, profile-specific per
     * environment) rather than hardcoding here.</p>
     *
     * @return the {@link CorsConfigurationSource} consulted by the filter
     * chain's {@code .cors(...)} configurer
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://10.212.45.*:*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Permits cookies/credentialed requests for a future httpOnly refresh-token
        // flow. Safe to combine with credentials=true only because the origin above
        // is an explicit value, never a wildcard ("*") — browsers reject that combination.
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
