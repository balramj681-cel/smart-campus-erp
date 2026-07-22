/**
 * @file AuthContext.jsx
 * @description Global authentication state for Smart Campus ERP.
 *
 * ─── WHAT THIS FILE OWNS ─────────────────────────────────────────────────────
 *
 *   • The single source of truth for: user, isAuthenticated, authStatus.
 *   • login()  — triggers loginUser() from authService, updates state, navigates.
 *   • logout() — triggers logoutUser() from authService, resets state, navigates.
 *   • Session restore on every page refresh (via useEffect on mount).
 *   • Context-level error state so any component can read the last auth error.
 *   • Permission helpers pre-bound to the current user (no prop-drilling).
 *
 * ─── WHAT THIS FILE DOES NOT OWN ─────────────────────────────────────────────
 *
 *   • HTTP calls          → api.js / authApi
 *   • Business logic      → authService.js
 *   • Storage reads/writes → storage.js
 *   • Validation          → validators.js
 *   • Navigation          → called here but defined by React Router
 *
 * ─── AUTH STATUS MACHINE ─────────────────────────────────────────────────────
 *
 *   "idle"           App just mounted, haven't checked storage yet.
 *   "restoring"      Checking localStorage / attempting silent refresh.
 *   "authenticated"  User is confirmed logged in with a valid session.
 *   "unauthenticated" No valid session — show Login page.
 *   "loading"        An explicit login/logout call is in-flight.
 *   "error"          Last auth operation failed.
 *
 *   Consumers check `authStatus` (not just `isAuthenticated`) so they can
 *   render different UI for "still checking" vs "definitely logged out".
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *
 *   // 1. Wrap your app (main.jsx or App.jsx)
 *   <AuthProvider>
 *     <RouterProvider router={router} />
 *   </AuthProvider>
 *
 *   // 2. Consume in any component via the hook (see useAuth.js)
 *   const { user, login, logout, can } = useAuth();
 *
 *   // 3. Gate UI by permission
 *   {can(PERMISSIONS.MANAGE_GRADES) && <GradeEditor />}
 *
 *   // 4. Gate UI by role
 *   {user.isAdmin && <AdminPanel />}
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  loginUser,
  logoutUser,
  restoreSession,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasRole,
  formatRole,
  getRoleBadgeClasses,
  getTokenExpiryMinutes,
  ROLES,
  PERMISSIONS,
  ROLE_DEFAULT_ROUTES,
} from "../services/authService";

// ─── 1. Auth Status Constants ────────────────────────────────────────────────

/**
 * All valid values for authStatus.
 * Exported so route guards and components can compare without magic strings.
 *
 * @readonly
 */
export const AUTH_STATUS = Object.freeze({
  IDLE:             "idle",
  RESTORING:        "restoring",
  AUTHENTICATED:    "authenticated",
  UNAUTHENTICATED:  "unauthenticated",
  LOADING:          "loading",
  ERROR:            "error",
});

// ─── 2. State Shape & Initial State ──────────────────────────────────────────

/**
 * The complete shape of the auth state managed by the reducer.
 *
 * @typedef {Object} AuthState
 * @property {Object|null} user            - Enriched user object or null.
 * @property {string}      authStatus      - One of AUTH_STATUS.* values.
 * @property {Object|null} error           - Last auth error or null.
 * @property {string|null} lastLoginAt     - ISO timestamp of last login.
 */

/** @type {AuthState} */
const INITIAL_STATE = {
  user:         null,
  authStatus:   AUTH_STATUS.IDLE,
  error:        null,
  lastLoginAt:  null,
};

// ─── 3. Reducer ───────────────────────────────────────────────────────────────

/**
 * Pure reducer for all auth state transitions.
 *
 * WHY A REDUCER INSTEAD OF MULTIPLE useStates:
 *   Auth has interdependent state — setting `user` without setting
 *   `authStatus` would leave the UI in an inconsistent state for one render
 *   cycle. useReducer guarantees atomic state transitions: all related
 *   fields update in the same render.
 *
 * Action types are defined as a frozen object below the reducer to keep
 * this file self-contained and avoid string typos.
 */

const AUTH_ACTIONS = Object.freeze({
  RESTORE_START:   "RESTORE_START",
  RESTORE_SUCCESS: "RESTORE_SUCCESS",
  RESTORE_FAIL:    "RESTORE_FAIL",
  LOGIN_START:     "LOGIN_START",
  LOGIN_SUCCESS:   "LOGIN_SUCCESS",
  LOGIN_FAIL:      "LOGIN_FAIL",
  LOGOUT_START:    "LOGOUT_START",
  LOGOUT_COMPLETE: "LOGOUT_COMPLETE",
  CLEAR_ERROR:     "CLEAR_ERROR",
  UPDATE_USER:     "UPDATE_USER",
});

/**
 * @param {AuthState} state
 * @param {{ type: string, payload?: * }} action
 * @returns {AuthState}
 */
function authReducer(state, action) {
  switch (action.type) {

    // ── Session restore (page refresh) ──
    case AUTH_ACTIONS.RESTORE_START:
      return { ...state, authStatus: AUTH_STATUS.RESTORING, error: null };

    case AUTH_ACTIONS.RESTORE_SUCCESS:
      return {
        ...state,
        user:        action.payload.user,
        authStatus:  AUTH_STATUS.AUTHENTICATED,
        error:       null,
      };

    case AUTH_ACTIONS.RESTORE_FAIL:
      return {
        ...INITIAL_STATE,
        authStatus: AUTH_STATUS.UNAUTHENTICATED,
      };

    // ── Explicit login ──
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, authStatus: AUTH_STATUS.LOADING, error: null };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user:         action.payload.user,
        authStatus:   AUTH_STATUS.AUTHENTICATED,
        error:        null,
        lastLoginAt:  new Date().toISOString(),
      };

    case AUTH_ACTIONS.LOGIN_FAIL:
      return {
        ...state,
        authStatus: AUTH_STATUS.ERROR,
        error:      action.payload.error,
        user:       null,
      };

    // ── Logout ──
    case AUTH_ACTIONS.LOGOUT_START:
      return { ...state, authStatus: AUTH_STATUS.LOADING };

    case AUTH_ACTIONS.LOGOUT_COMPLETE:
      // Full reset — don't carry over any previous session state
      return { ...INITIAL_STATE, authStatus: AUTH_STATUS.UNAUTHENTICATED };

    // ── Utilities ──
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error:      null,
        authStatus: state.user
          ? AUTH_STATUS.AUTHENTICATED
          : AUTH_STATUS.UNAUTHENTICATED,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      // Merge partial user updates (e.g. after profile edit)
      return {
        ...state,
        user: { ...state.user, ...action.payload.updates },
      };

    default:
      return state;
  }
}

// ─── 4. Context Creation ─────────────────────────────────────────────────────

/**
 * The React context object.
 *
 * We provide a null default so useAuth() can detect if it's used outside
 * the provider and throw a helpful error (see useAuth.js).
 *
 * @type {React.Context<AuthContextValue|null>}
 */
export const AuthContext = createContext(null);

// ─── 5. AuthProvider ─────────────────────────────────────────────────────────

/**
 * Wrap your entire app with this provider (in main.jsx or App.jsx).
 * Every child component gains access to the auth context via useAuth().
 *
 * @param {Object}          props
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const navigate           = useNavigate();

  /**
   * Ref to track whether the component is still mounted before dispatching
   * after async operations. Prevents the React "can't update unmounted
   * component" warning during development and HMR.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── 5a. Session Restore on Mount ─────────────────────────────────────────

  /**
   * On every app mount (including page refreshes), attempt to restore the
   * previous session from localStorage.
   *
   * Flow:
   *   1. Dispatch RESTORE_START → renders a global loading spinner.
   *   2. Call restoreSession() from authService — it checks storage,
   *      validates the token, and silently refreshes if expired.
   *   3. On success → RESTORE_SUCCESS, user is hydrated, app renders normally.
   *   4. On failure → RESTORE_FAIL, user sees the login page.
   *
   * The empty dependency array [] means this runs ONCE on mount only.
   * It must not re-run on every render or it would create an infinite loop.
   */
  useEffect(() => {
    let cancelled = false;

    async function attemptRestore() {
      dispatch({ type: AUTH_ACTIONS.RESTORE_START });

      try {
        const user = await restoreSession();

        if (cancelled) return;

        if (user) {
          dispatch({ type: AUTH_ACTIONS.RESTORE_SUCCESS, payload: { user } });
        } else {
          dispatch({ type: AUTH_ACTIONS.RESTORE_FAIL });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[AuthContext] Session restore threw:", err);
        dispatch({ type: AUTH_ACTIONS.RESTORE_FAIL });
      }
    }

    attemptRestore();

    // Cleanup: if the component unmounts while restore is in-flight,
    // ignore the result to avoid state updates on an unmounted tree.
    return () => { cancelled = true; };
  }, []);

  // ─── 5b. login() ──────────────────────────────────────────────────────────

  /**
   * Log the user in.
   *
   * Called by LoginForm on submit. Orchestrates:
   *   1. Dispatches LOGIN_START → disables the button, shows spinner.
   *   2. Calls loginUser() from authService (API call + storage write).
   *   3. On success: updates state, shows welcome toast, navigates to dashboard.
   *   4. On failure: updates state with error, shows error toast.
   *
   * Returns { success, error } so the calling component can react without
   * needing to read context state directly after the call.
   *
   * @param {Object}  credentials
   * @param {string}  credentials.email
   * @param {string}  credentials.password
   * @param {boolean} [credentials.rememberMe=false]
   * @param {string}  [redirectTo]  - Override the role-based default route.
   * @returns {Promise<{ success: boolean, error: Object|null }>}
   *
   * @example
   * const { success, error } = await login({ email, password, rememberMe });
   * if (!success) setFormError(error.message);
   */
  const login = useCallback(async ({ email, password, rememberMe = false }, redirectTo) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const { user, defaultRoute } = await loginUser({ email, password, rememberMe });

      if (!mountedRef.current) return { success: false, error: null };

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });

      // Show a personalised welcome toast
      toast.success(`Welcome back, ${user.name.split(" ")[0]}! 👋`, {
        id:       "login-success", // Deduplicate if called twice accidentally
        duration: 3000,
        style: {
          borderRadius: "12px",
          background:   "#0F172A",
          color:        "#F8FAFC",
          fontFamily:   "Poppins, sans-serif",
          fontSize:     "14px",
        },
        iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
      });

      // Navigate to the role-appropriate dashboard (or the override route)
      const destination = redirectTo ?? defaultRoute;
      navigate(destination, { replace: true });

      return { success: true, error: null };

    } catch (err) {
      if (!mountedRef.current) return { success: false, error: err };

      const error = {
        message:    err?.message    ?? "Login failed. Please try again.",
        code:       err?.code       ?? "LOGIN_ERROR",
        statusCode: err?.statusCode ?? 0,
      };

      dispatch({ type: AUTH_ACTIONS.LOGIN_FAIL, payload: { error } });

      // Show a toast for network errors (field errors are shown inline)
      if (err?.statusCode === 0) {
        toast.error("Unable to reach the server. Check your connection.", {
          id: "login-network-error",
          style: {
            borderRadius: "12px",
            fontFamily:   "Poppins, sans-serif",
          },
        });
      }

      return { success: false, error };
    }
  }, [navigate]);

  // ─── 5c. logout() ─────────────────────────────────────────────────────────

  /**
   * Log the current user out.
   *
   * Orchestrates:
   *   1. Dispatches LOGOUT_START.
   *   2. Calls logoutUser() from authService (server invalidation + storage clear).
   *   3. Dispatches LOGOUT_COMPLETE → resets all auth state to initial.
   *   4. Shows a goodbye toast.
   *   5. Navigates to /login.
   *
   * Always resolves — even if the server call fails, the user is logged out
   * locally. See logoutUser() in authService for why.
   *
   * @param {Object}  [options]
   * @param {boolean} [options.silent=false]  - Skip the toast (e.g. on 401 forced logout).
   * @param {string}  [options.redirectTo]    - Override the default /login redirect.
   * @returns {Promise<void>}
   */
  const logout = useCallback(async ({ silent = false, redirectTo = "/login" } = {}) => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT_START });

    await logoutUser(); // Best-effort; never throws

    if (!mountedRef.current) return;

    dispatch({ type: AUTH_ACTIONS.LOGOUT_COMPLETE });

    if (!silent) {
      toast.success("You've been signed out successfully.", {
        id:       "logout-success",
        duration: 2500,
        style: {
          borderRadius: "12px",
          background:   "#0F172A",
          color:        "#F8FAFC",
          fontFamily:   "Poppins, sans-serif",
          fontSize:     "14px",
        },
      });
    }

    navigate(redirectTo, { replace: true });
  }, [navigate]);

  // ─── 5d. updateUser() ─────────────────────────────────────────────────────

  /**
   * Merge partial updates into the current user object in state.
   *
   * Use after a successful profile edit so the UI reflects the changes
   * instantly without a full re-login or refetch.
   *
   * @param {Object} updates - Partial user fields to merge.
   *
   * @example
   * await profileApi.update({ name: "New Name" });
   * updateUser({ name: "New Name" }); // State updates instantly
   */
  const updateUser = useCallback((updates) => {
    if (!state.user) return;
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: { updates } });
  }, [state.user]);

  // ─── 5e. clearError() ────────────────────────────────────────────────────

  /**
   * Clear the last auth error and return to the appropriate idle status.
   * Called when the user starts typing again after a failed login attempt.
   */
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // ─── 6. Derived State ────────────────────────────────────────────────────

  /**
   * Convenience booleans derived from authStatus.
   * Computed once here so every consumer gets consistent values.
   */
  const isAuthenticated  = state.authStatus === AUTH_STATUS.AUTHENTICATED;
  const isLoading        = state.authStatus === AUTH_STATUS.LOADING;
  const isRestoring      = state.authStatus === AUTH_STATUS.RESTORING;
  const isIdle           = state.authStatus === AUTH_STATUS.IDLE;

  /**
   * True while the app hasn't yet determined auth state.
   * Use this to render a full-page loading skeleton instead of flashing
   * the login page before the session restore check completes.
   */
  const isInitializing = isIdle || isRestoring;

  // ─── 7. Permission Helpers Bound to Current User ─────────────────────────

  /**
   * Check if the current user has a specific permission.
   *
   * @param {string} permission - One of PERMISSIONS.*
   * @returns {boolean}
   *
   * @example
   * const { can } = useAuth();
   * {can(PERMISSIONS.MANAGE_GRADES) && <GradeEditor />}
   */
  const can = useCallback(
    (permission) => hasPermission(state.user, permission),
    [state.user]
  );

  /**
   * Check if the current user has ALL of the given permissions.
   *
   * @param {string[]} permissions
   * @returns {boolean}
   *
   * @example
   * canAll([PERMISSIONS.MANAGE_COURSES, PERMISSIONS.MANAGE_GRADES])
   */
  const canAll = useCallback(
    (permissions) => hasAllPermissions(state.user, permissions),
    [state.user]
  );

  /**
   * Check if the current user has ANY of the given permissions.
   *
   * @param {string[]} permissions
   * @returns {boolean}
   *
   * @example
   * canAny([PERMISSIONS.VIEW_ALL_FEES, PERMISSIONS.MANAGE_FEES])
   */
  const canAny = useCallback(
    (permissions) => hasAnyPermission(state.user, permissions),
    [state.user]
  );

  /**
   * Check if the current user has the given role(s).
   * Prefer can() for feature gating; use is() when role identity matters.
   *
   * @param {string|string[]} role
   * @returns {boolean}
   *
   * @example
   * is(ROLES.STUDENT)              // true / false
   * is([ROLES.ADMIN, ROLES.STAFF]) // true if either role matches
   */
  const is = useCallback(
    (role) => hasRole(state.user, role),
    [state.user]
  );

  /**
   * How many minutes until the current access token expires.
   * Useful for rendering "Session expires in X min" warnings.
   *
   * @returns {number}
   */
  const sessionExpiresIn = useCallback(() => getTokenExpiryMinutes(), []);

  /**
   * Display-friendly role label for the current user.
   * e.g. "admin" → "Administrator"
   *
   * @returns {string}
   */
  const roleLabel = state.user ? formatRole(state.user.role) : "";

  /**
   * Tailwind badge classes for the current user's role.
   * e.g. { bg: "bg-purple-100", text: "text-purple-700" } for admin.
   *
   * @returns {{ bg: string, text: string }}
   */
  const roleBadge = state.user ? getRoleBadgeClasses(state.user.role) : {};

  // ─── 8. Context Value ────────────────────────────────────────────────────

  /**
   * useMemo prevents creating a new object reference on every render.
   * Without it, every consumer would re-render even when nothing changed
   * because a new object always fails reference equality in React.
   *
   * Only recalculates when the specific values inside actually change.
   */
  const contextValue = useMemo(() => ({
    // ── State ──
    user:            state.user,
    authStatus:      state.authStatus,
    error:           state.error,
    lastLoginAt:     state.lastLoginAt,

    // ── Derived booleans ──
    isAuthenticated,
    isLoading,
    isRestoring,
    isInitializing,

    // ── Actions ──
    login,
    logout,
    updateUser,
    clearError,

    // ── Permission helpers ──
    can,
    canAll,
    canAny,
    is,
    sessionExpiresIn,

    // ── Display helpers ──
    roleLabel,
    roleBadge,

    // ── Re-exported constants (so consumers don't need separate imports) ──
    ROLES,
    PERMISSIONS,
    AUTH_STATUS,
    ROLE_DEFAULT_ROUTES,
  }), [
    state,
    isAuthenticated,
    isLoading,
    isRestoring,
    isInitializing,
    login,
    logout,
    updateUser,
    clearError,
    can,
    canAll,
    canAny,
    is,
    sessionExpiresIn,
    roleLabel,
    roleBadge,
  ]);

  // ─── 9. Render ───────────────────────────────────────────────────────────

  /**
   * While initializing, render a full-page loading screen so the user
   * never sees a flash of the Login page before the session check completes.
   *
   * Replace the spinner below with your actual app skeleton/loader component.
   */
  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── 10. Internal Loading Screen ────────────────────────────────────────────

/**
 * Shown during the ~200-600ms session restore check on page load.
 * Prevents the jarring flash of Login → Dashboard on refresh.
 *
 * Keep this component in this file — it's an implementation detail of
 * AuthProvider and shouldn't be imported anywhere else.
 */
function AuthLoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4"
      role="status"
      aria-label="Checking your session…"
    >
      {/* Logo mark */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <span className="text-white font-bold text-lg">SC</span>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <p className="text-sm text-slate-400 font-medium">
        Checking your session…
      </p>
    </div>
  );
}

// ─── 11. Raw Context Export ──────────────────────────────────────────────────

/**
 * The raw context is exported so useAuth.js can consume it.
 * Components should NEVER import AuthContext directly —
 * always use the useAuth() hook instead (it adds the null guard).
 *
 * The default export is the Provider for cleaner imports in main.jsx:
 *   import AuthProvider from "../context/AuthContext";
 */
export default AuthProvider;