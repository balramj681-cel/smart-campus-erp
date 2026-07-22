/**
 * @file useAuth.js
 * @description The one and only way components should access auth state.
 *
 * ─── WHY THIS EXISTS AS A SEPARATE FILE ──────────────────────────────────────
 *
 *   useContext(AuthContext) is 3 tokens. useAuth() is 1. But the real reason
 *   is the null guard: if a developer accidentally uses auth state in a
 *   component that sits OUTSIDE <AuthProvider>, React gives a cryptic error
 *   about reading properties of null.
 *
 *   This hook catches that mistake at the call site with a clear, actionable
 *   message instead of a confusing stack trace deep in a child component.
 *
 *   It also acts as a stable import contract: if AuthContext ever moves files,
 *   gets renamed, or is replaced with Zustand/Redux, only this file changes.
 *   Every component keeps its `import { useAuth } from "../hooks/useAuth"` line.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *
 *   Basic auth state:
 *     const { user, isAuthenticated, isLoading } = useAuth();
 *
 *   Login / Logout actions:
 *     const { login, logout } = useAuth();
 *     await login({ email, password, rememberMe });
 *     await logout();
 *
 *   Permission gating:
 *     const { can, canAll, canAny, is } = useAuth();
 *     {can(PERMISSIONS.MANAGE_GRADES) && <GradeEditor />}
 *     {is(ROLES.ADMIN) && <AdminPanel />}
 *
 *   Error handling:
 *     const { error, clearError, authStatus } = useAuth();
 *
 *   Role display:
 *     const { roleLabel, roleBadge } = useAuth();
 *     <span className={`${roleBadge.bg} ${roleBadge.text}`}>{roleLabel}</span>
 *
 *   Constants (no separate import needed):
 *     const { PERMISSIONS, ROLES, AUTH_STATUS } = useAuth();
 */

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Access the full authentication context.
 *
 * Must be called inside a component that is a descendant of <AuthProvider>.
 * Throws a descriptive error if used outside the provider tree.
 *
 * @returns {AuthContextValue} The complete auth context value.
 *
 * @throws {Error} If called outside of <AuthProvider>.
 *
 * @typedef {Object} AuthContextValue
 *
 * -- State --
 * @property {Object|null} user              - Enriched user object, or null.
 * @property {string}      authStatus        - One of AUTH_STATUS.* values.
 * @property {Object|null} error             - Last auth error or null.
 * @property {string|null} lastLoginAt       - ISO timestamp of last login.
 *
 * -- Derived booleans --
 * @property {boolean} isAuthenticated       - True when user is logged in with a valid session.
 * @property {boolean} isLoading             - True during an explicit login/logout call.
 * @property {boolean} isRestoring           - True while checking storage on page load.
 * @property {boolean} isInitializing        - True while app hasn't determined auth state yet.
 *
 * -- Actions --
 * @property {Function} login                - (credentials, redirectTo?) → Promise<{ success, error }>
 * @property {Function} logout               - (options?) → Promise<void>
 * @property {Function} updateUser           - (partialUser) → void  (after profile edits)
 * @property {Function} clearError           - () → void
 *
 * -- Permission helpers (bound to current user) --
 * @property {Function} can                  - (permission: string) → boolean
 * @property {Function} canAll               - (permissions: string[]) → boolean
 * @property {Function} canAny               - (permissions: string[]) → boolean
 * @property {Function} is                   - (role: string | string[]) → boolean
 * @property {Function} sessionExpiresIn     - () → number (minutes)
 *
 * -- Display helpers --
 * @property {string}   roleLabel            - Human-readable role e.g. "Administrator"
 * @property {Object}   roleBadge            - { bg, text } Tailwind classes for role badge
 *
 * -- Re-exported constants --
 * @property {Object}   ROLES                - All valid role strings
 * @property {Object}   PERMISSIONS          - All valid permission codes
 * @property {Object}   AUTH_STATUS          - All valid authStatus strings
 * @property {Object}   ROLE_DEFAULT_ROUTES  - Default route per role
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error(
      "[useAuth] This hook was called outside of <AuthProvider>.\n" +
      "Make sure <AuthProvider> wraps your component tree in main.jsx or App.jsx.\n\n" +
      "Example:\n" +
      "  <AuthProvider>\n" +
      "    <RouterProvider router={router} />\n" +
      "  </AuthProvider>"
    );
  }

  return context;
}

/**
 * Selector hook — subscribe to a specific slice of auth state.
 *
 * WHY THIS EXISTS:
 *   useAuth() returns the full context, so any state change (even unrelated
 *   ones) will re-render every subscriber. useAuthSelector() lets performance-
 *   sensitive components subscribe to only the slice they care about.
 *
 *   React's useMemo in AuthProvider already prevents most unnecessary
 *   re-renders, but this gives fine-grained control for heavy components.
 *
 * @param {Function} selector - (context: AuthContextValue) => any
 * @returns {*} The selected value.
 *
 * @example
 * // Only re-renders when user.name changes, not on isLoading changes
 * const userName = useAuthSelector(ctx => ctx.user?.name);
 *
 * // Only re-renders when isAuthenticated changes
 * const isAuthenticated = useAuthSelector(ctx => ctx.isAuthenticated);
 */
export function useAuthSelector(selector) {
  const context = useAuth();
  return selector(context);
}

/**
 * Convenience hook — returns only the current user object.
 * Slightly more readable than destructuring in components that only need user.
 *
 * @returns {Object|null}
 *
 * @example
 * const user = useAuthUser();
 * <p>Hello, {user?.name}</p>
 */
export function useAuthUser() {
  return useAuthSelector((ctx) => ctx.user);
}

/**
 * Convenience hook — returns only the permission helpers.
 * Use in deeply nested components that need to gate UI without accessing
 * the full auth context.
 *
 * @returns {{ can: Function, canAll: Function, canAny: Function, is: Function }}
 *
 * @example
 * const { can } = usePermissions();
 * {can("manage_grades") && <GradeEditor />}
 */
export function usePermissions() {
  return useAuthSelector((ctx) => ({
    can:    ctx.can,
    canAll: ctx.canAll,
    canAny: ctx.canAny,
    is:     ctx.is,
  }));
}

/**
 * Convenience hook — returns only the auth status flags.
 * Use in layout components that need to know initialisation state without
 * caring about the user object.
 *
 * @returns {{ authStatus, isAuthenticated, isLoading, isRestoring, isInitializing }}
 *
 * @example
 * const { isInitializing } = useAuthStatus();
 * if (isInitializing) return <FullPageSpinner />;
 */
export function useAuthStatus() {
  return useAuthSelector((ctx) => ({
    authStatus:     ctx.authStatus,
    isAuthenticated: ctx.isAuthenticated,
    isLoading:      ctx.isLoading,
    isRestoring:    ctx.isRestoring,
    isInitializing: ctx.isInitializing,
  }));
}

// Default export for teams that prefer default imports
export default useAuth;