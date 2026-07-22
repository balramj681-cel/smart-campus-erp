package com.smartcampus.erp.infrastructure.security.userdetails;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.smartcampus.erp.domain.auth.User;
import com.smartcampus.erp.infrastructure.persistence.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Adapts a {@link User} entity into Spring Security's {@link UserDetails}
 * contract — the bridge between "how this ERP stores accounts" and "how
 * Spring Security's authentication machinery understands a principal."
 *
 * <h2>Why Spring Security needs {@code UserDetailsService}</h2>
 * Spring Security's authentication providers are deliberately decoupled
 * from any specific way of storing user data — they have no idea whether
 * accounts live in PostgreSQL, LDAP, an external SSO provider, or
 * somewhere else entirely. {@code UserDetailsService} is the single-method
 * contract that bridges an arbitrary persistence mechanism to the
 * framework-agnostic shape Spring Security actually understands:
 * {@link UserDetails} — a username, a password hash, a set of authorities,
 * and a handful of account-state flags. Every
 * {@code DaoAuthenticationProvider} ultimately calls this interface to
 * resolve "who is this person claiming to be" before it ever attempts to
 * verify a password.
 *
 * <h2>Why email is used instead of username</h2>
 * This ERP has no separate "username" concept — {@link User}'s own
 * Javadoc establishes email as the single login identifier across every
 * role. Spring Security's {@code loadUserByUsername(String username)}
 * method is named generically (the framework was designed assuming many
 * systems have a literal username field), but the contract itself doesn't
 * require that — it only needs whatever unique identifier the application
 * uses to look up an account. Passing the email straight through as that
 * identifier avoids inventing a redundant "username" field that would need
 * its own uniqueness constraint and could drift out of sync with email
 * over time.
 *
 * <h2>How {@code AuthenticationManager} calls this class</h2>
 * When the future login use case calls
 * {@code authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, rawPassword))},
 * Spring Security's {@code ProviderManager} delegates to a
 * {@code DaoAuthenticationProvider} — auto-configured because this class's
 * {@code UserDetailsService} bean and the {@code PasswordEncoder} bean
 * (see {@code PasswordEncoderConfig}) both exist in the application
 * context, which is exactly the wiring {@code SecurityConfig}'s
 * {@code AuthenticationManager} bean was built to transparently pick up.
 * That provider calls {@link #loadUserByUsername(String)} on this class to
 * fetch the account, then uses the {@code PasswordEncoder} to compare the
 * submitted raw password against the stored BCrypt hash. If both the
 * lookup and the password match succeed, an authenticated
 * {@code Authentication} carrying this class's {@code UserDetails}
 * (authorities included) is returned; if either fails, an
 * {@code AuthenticationException} propagates back to the caller.
 *
 * <h2>Why {@link UserRepository} is injected</h2>
 * This class's entire job is translating "an email string" into a
 * Spring-Security-shaped {@code UserDetails}, and the only way to do that
 * is to actually look the account up — {@code UserRepository} is the
 * existing abstraction for exactly that. It's supplied via constructor
 * injection (not field injection) so the dependency is explicit,
 * immutable, and trivially testable: a unit test can construct
 * {@code new CustomUserDetailsService(mockUserRepository)} directly,
 * without needing a Spring application context at all.
 *
 * <h2>Why {@link User} itself does NOT implement {@code UserDetails}</h2>
 * As established when {@code User} was built, the entity is deliberately
 * kept free of Spring-Security-specific interfaces, so it can be used
 * everywhere in the system — registration, profile updates, admin
 * management — without dragging Spring Security's API surface along. The
 * translation between "what a {@code User} is" and "what Spring Security
 * needs to authenticate someone" lives in exactly one place: here. If a
 * richer principal is ever needed later (e.g. a custom {@code UserDetails}
 * exposing the user's UUID or full name directly to controllers), only
 * this adapter changes — the domain entity stays untouched.
 *
 * <h2>How this fits into the JWT authentication flow</h2>
 * This class does its work exactly once per login — the moment a user
 * submits credentials to the (future) login endpoint. It is not the JWT
 * filter that will guard subsequent authenticated requests; the JWT token
 * issued after a successful login here is the proof of identity for those
 * requests, not a fresh database lookup. That said, this same class
 * remains a reusable building block for whichever strategy the upcoming
 * JWT filter adopts: it can call {@link #loadUserByUsername(String)} again
 * on every request to rebuild an always-current {@code Authentication}
 * (an extra database read per request, but authority/enabled-state changes
 * take effect immediately), or it can be bypassed in favor of
 * reconstructing a lightweight {@code Authentication} directly from the
 * token's claims (faster, but changes only take effect once the token
 * expires or is refreshed). That trade-off is a decision for the JWT
 * filter itself, not something this class needs to anticipate.
 *
 * @author Smart Campus ERP Engineering
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads the account identified by {@code email} and adapts it into
     * Spring Security's {@link UserDetails} contract.
     *
     * @param email the login email submitted for authentication, passed
     *              through Spring Security's generically-named
     *              {@code username} parameter
     * @return a {@link UserDetails} view of the matching {@link User}
     * @throws UsernameNotFoundException if no account exists for the
     *                                    given email
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No account found with email: " + email));

        List<GrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority(user.getRole().getAuthority()));

        // Account-state flags this domain actually models. accountNonExpired
        // and credentialsNonExpired have no equivalent on User yet — both are
        // hardcoded true rather than silently misrepresenting a concept the
        // domain doesn't track. If password-expiry or account-expiry policies
        // are introduced later, they plug in here without touching anything
        // else in this class.
        boolean accountNonExpired = true;
        boolean credentialsNonExpired = true;
        boolean accountNonLocked = !user.isAccountLocked();

        // Fully qualified to avoid a name collision with our own domain
        // User (com.smartcampus.erp.domain.auth.User) — both classes are
        // legitimately named "User", so only one can be imported unqualified.
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.isEnabled(),
                accountNonExpired,
                credentialsNonExpired,
                accountNonLocked,
                authorities
        );
    }
}