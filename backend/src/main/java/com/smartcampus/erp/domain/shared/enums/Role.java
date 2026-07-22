package com.smartcampus.erp.domain.shared.enums;

/**
 * Centralized, type-safe definition of every role recognized by the Smart
 * Campus ERP system.
 *
 * <h2>Why roles are centralized</h2>
 * Without a single source of truth, role names tend to leak out as
 * "magic strings" scattered across the codebase — one literal in
 * {@code SecurityConfig}, another in JWT-claim handling code, another in
 * database seed scripts, another in a frontend constants file — each a
 * separate place a typo or inconsistency can silently creep in. Defining
 * every valid role exactly once, here, means the compiler — not code
 * review — is what catches an invalid or misspelled role anywhere it's
 * referenced. Adding a future role (e.g. {@code HOSTEL_WARDEN}) means
 * extending this one enum; every place that switches on {@code Role} can
 * then be revisited deliberately rather than silently missing the new case.
 *
 * <h2>Why enums are safer than String roles</h2>
 * A {@code String role} field can hold literally any value —
 * {@code "ADMIN"}, {@code "Admin"}, {@code "admnin"} (a typo) are all
 * valid as far as the compiler is concerned, and the failure mode for a
 * mismatch is a silent authorization bug discovered in production, not a
 * build error. An {@code enum} makes invalid states unrepresentable: it is
 * not possible to construct a {@code Role} that isn't one of the eight
 * constants declared below. This also unlocks IDE-level safety —
 * autocomplete, "find usages," and safe rename refactoring all work for an
 * enum in a way they fundamentally cannot for string literals — and, on
 * Java 21, exhaustive {@code switch} expressions over an enum let the
 * compiler flag any code path that forgets to handle a role, rather than
 * silently falling through a missing {@code if}/{@code else} branch.
 *
 * <h2>How Spring Security will use {@code ROLE_*} authorities</h2>
 * Spring Security has a long-standing convention: its
 * {@code hasRole("ADMIN")} expression and role-based voters look for a
 * {@code GrantedAuthority} whose string value is prefixed with
 * {@code "ROLE_"} — i.e. {@code "ROLE_ADMIN"}, not {@code "ADMIN"}. Getting
 * that prefix wrong (or forgetting it) at any one of several call sites is
 * a classic source of "authorization just silently doesn't work" bugs.
 * {@link #getAuthority()} centralizes that prefixing in exactly one place,
 * so every consumer — most importantly the future
 * {@code CustomUserDetailsService}, which will build each user's
 * {@code Collection<GrantedAuthority>} as
 * {@code new SimpleGrantedAuthority(role.getAuthority())} — gets a
 * consistent, correctly-formatted authority without re-implementing the
 * prefixing logic itself.
 *
 * <h2>How JWT will store the role</h2>
 * A JSON Web Token's payload is plain JSON, so it cannot hold a Java
 * {@code Role} instance directly — the plan is to store the bare enum
 * name (e.g. {@code "ADMIN"}, via {@link #name()}) as a string claim,
 * deliberately <i>without</i> the {@code "ROLE_"} prefix. The prefix is a
 * Spring-Security-specific convention, not an intrinsic property of the
 * role itself, so it has no business leaking into the token format. On
 * every authenticated request, the (not yet built) JWT filter will read
 * that claim, safely reconstruct the enum via {@code Role.valueOf(claim)}
 * — which throws immediately on any tampered or invalid value rather than
 * silently accepting it — and only then call {@link #getAuthority()} to
 * build the {@code GrantedAuthority} Spring Security needs.
 *
 * <h2>Why helper methods keep business logic clean</h2>
 * {@link #isAdmin()}, {@link #isAcademicRole()}, {@link #isFinanceRole()},
 * and {@link #isLibraryRole()} encapsulate role-grouping logic that would
 * otherwise be duplicated as ad hoc conditionals — {@code role == ADMIN ||
 * role == SUPER_ADMIN} — copy-pasted across whichever controllers and
 * services happen to need that check. Centralizing it here means: there is
 * one place that defines what counts as an "admin" role; when a new role
 * should join that group, exactly one line changes instead of hunting down
 * every duplicated condition; and call sites read as intent —
 * {@code if (role.isAdmin())} — rather than as a list of enum comparisons
 * the reader has to mentally decode. This is the Tell-Don't-Ask
 * principle applied to an enum: the role itself answers "what kind of
 * role am I," rather than every caller re-deriving the answer independently.
 * <p>Note that {@link #STAFF} deliberately belongs to none of these four
 * groupings — it represents general non-specialized administrative staff,
 * distinct from the specialized roles ({@code ACCOUNTANT},
 * {@code LIBRARIAN}) and the academic/admin groupings each helper checks
 * for.</p>
 *
 * @author Smart Campus ERP Engineering
 */
public enum Role {

    SUPER_ADMIN(
            "Super Administrator",
            "Has unrestricted access to every module and system-level configuration across the institution."
    ),
    ADMIN(
            "Administrator",
            "Has complete administrative access to institutional resources."
    ),
    FACULTY(
            "Faculty",
            "Teaching staff responsible for courses, attendance, and examination records of assigned students."
    ),
    STUDENT(
            "Student",
            "Enrolled learner with access to their own academic, attendance, and fee records."
    ),
    STAFF(
            "Staff",
            "Non-teaching administrative staff supporting day-to-day institutional operations."
    ),
    LIBRARIAN(
            "Librarian",
            "Manages the library catalogue, book issuance, and due-date tracking."
    ),
    ACCOUNTANT(
            "Accountant",
            "Manages fee structures, invoices, and all financial transactions of the institution."
    ),
    EXAM_CONTROLLER(
            "Exam Controller",
            "Oversees examination scheduling, grading workflows, and result publication."
    );

    /**
     * Human-readable label suitable for display in the UI (e.g. a user
     * profile screen or an admin role-management dropdown).
     */
    private final String displayName;

    /**
     * One-line summary of what this role is responsible for within the
     * ERP — used in tooltips, admin documentation, and role-management
     * screens.
     */
    private final String description;

    Role(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Returns this role formatted as a Spring Security authority string
     * (e.g. {@code "ROLE_ADMIN"}), suitable for wrapping in a
     * {@code SimpleGrantedAuthority} when building a user's authorities.
     *
     * @return this role's name prefixed with {@code "ROLE_"}
     */
    public String getAuthority() {
        return "ROLE_" + this.name();
    }

    /**
     * @return {@code true} for {@link #SUPER_ADMIN} and {@link #ADMIN}
     */
    public boolean isAdmin() {
        return this == SUPER_ADMIN || this == ADMIN;
    }

    /**
     * @return {@code true} for {@link #FACULTY}, {@link #STUDENT}, and
     *         {@link #EXAM_CONTROLLER}
     */
    public boolean isAcademicRole() {
        return this == FACULTY || this == STUDENT || this == EXAM_CONTROLLER;
    }

    /**
     * @return {@code true} for {@link #ACCOUNTANT}
     */
    public boolean isFinanceRole() {
        return this == ACCOUNTANT;
    }

    /**
     * @return {@code true} for {@link #LIBRARIAN}
     */
    public boolean isLibraryRole() {
        return this == LIBRARIAN;
    }
}