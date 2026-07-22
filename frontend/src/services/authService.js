/**
 * @file authService.js
 * @description Business logic layer for all authentication operations.
 *
 * ─── WHAT CHANGED (Registration added) ───────────────────────────────────────
 *   Added: registerUser() — handles registration flow and navigation signal.
 *   Everything else is UNCHANGED from the original file.
 */

import { authApi } from "./api";
import {
  persistAuthSession,
  clearAuthSession,
  getAccessToken,
  getUser,
  hasActiveSession,
  isTokenExpired,
} from "../utils/storage";

// ─── 1. Role & Permission Definitions ────────────────────────────────────────

/** @readonly */
export const ROLES = Object.freeze({
  ADMIN:   "admin",
  FACULTY: "faculty",
  STUDENT: "student",
  STAFF:   "staff",
});

/** @readonly */
export const PERMISSIONS = Object.freeze({
  MANAGE_USERS:        "manage_users",
  VIEW_USERS:          "view_users",
  MANAGE_COURSES:      "manage_courses",
  VIEW_COURSES:        "view_courses",
  MANAGE_GRADES:       "manage_grades",
  VIEW_OWN_GRADES:     "view_own_grades",
  MANAGE_ATTENDANCE:   "manage_attendance",
  VIEW_OWN_ATTENDANCE: "view_own_attendance",
  MANAGE_FEES:         "manage_fees",
  VIEW_OWN_FEES:       "view_own_fees",
  VIEW_ALL_FEES:       "view_all_fees",
  VIEW_ANALYTICS:      "view_analytics",
  EXPORT_REPORTS:      "export_reports",
  MANAGE_SETTINGS:     "manage_settings",
  VIEW_SETTINGS:       "view_settings",
  PUBLISH_NOTICES:     "publish_notices",
  VIEW_NOTICES:        "view_notices",
});

/** @type {Record<string, string[]>} */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]:   Object.values(PERMISSIONS),
  [ROLES.FACULTY]: [
    PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_COURSES, PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.MANAGE_GRADES, PERMISSIONS.MANAGE_ATTENDANCE, PERMISSIONS.VIEW_ALL_FEES,
    PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.PUBLISH_NOTICES, PERMISSIONS.VIEW_NOTICES, PERMISSIONS.VIEW_SETTINGS,
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_COURSES, PERMISSIONS.VIEW_OWN_GRADES,
    PERMISSIONS.VIEW_OWN_ATTENDANCE, PERMISSIONS.VIEW_OWN_FEES, PERMISSIONS.VIEW_NOTICES,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_COURSES, PERMISSIONS.MANAGE_FEES,
    PERMISSIONS.VIEW_ALL_FEES, PERMISSIONS.PUBLISH_NOTICES,
    PERMISSIONS.VIEW_NOTICES, PERMISSIONS.VIEW_SETTINGS,
  ],
};

export const ROLE_DEFAULT_ROUTES = {
  [ROLES.ADMIN]:   "/dashboard",
  [ROLES.FACULTY]: "/dashboard",
  [ROLES.STUDENT]: "/dashboard",
  [ROLES.STAFF]:   "/dashboard",
};

// ─── 2. Session Orchestration ─────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * What it does:
 *   1. Calls authApi.register() — real or mock.
 *   2. Returns { success: true } so the component can navigate to /login.
 *
 * What it does NOT do:
 *   - Log the user in automatically (Admin assigns role first in this ERP).
 *   - Store any session data.
 *   - Navigate (component's responsibility after receiving success).
 *
 * @param {Object} payload
 * @param {string} payload.fullName
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<{ success: boolean }>}
 */
export async function registerUser({ fullName, email, password }) {
  await authApi.register({ fullName, email, password });
  return { success: true };
}

/**
 * Execute the full login flow and persist the resulting session.
 *
 * @param {Object}  credentials
 * @param {string}  credentials.email
 * @param {string}  credentials.password
 * @param {boolean} [credentials.rememberMe=false]
 * @returns {Promise<SessionResult>}
 */
export async function loginUser({ email: loginEmail, password, rememberMe = false }) {
  const response = await authApi.login({ email: loginEmail, password, rememberMe });
  console.log("LOGIN RESPONSE", response);

  const {
  userId,
  firstName,
  lastName,
  email,
  role,
  accessToken,
  refreshToken,
  photoUrl,
} = response;

const user = {
  id:   userId,
  name: `${firstName} ${lastName}`.trim(),
  email,
  role: role.toLowerCase(),
  photoUrl,
};

  const permissions  = user.permissions ?? resolvePermissions(user.role);
  const enrichedUser = buildUserProfile(user, permissions);

  persistAuthSession({
    accessToken,
    refreshToken,
    user: enrichedUser,
    rememberMe,
  });

  return {
    user:         enrichedUser,
    accessToken,
    defaultRoute: ROLE_DEFAULT_ROUTES[enrichedUser.role] ?? "/dashboard",
  };
}

/**
 * Execute the full logout flow.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await authApi.logout();
  } catch (error) {
    console.warn("[AuthService] Server logout failed (session cleared locally):", error?.message);
  } finally {
    clearAuthSession();
  }
}

/**
 * Restore a session from storage on app startup.
 * @returns {Promise<Object|null>}
 */
export async function restoreSession() {
  if (!hasActiveSession()) return null;

  try {
    if (!isTokenExpired()) {
      const cachedUser = getUser();
      if (cachedUser) {
        const permissions = resolvePermissions(cachedUser.role);
        return buildUserProfile(cachedUser, permissions);
      }
    }

    const refreshed = await silentRefresh();
    if (!refreshed) return null;

    const { user } = await authApi.getMe();
    const permissions  = resolvePermissions(user.role);
    const enrichedUser = buildUserProfile(user, permissions);
    persistAuthSession({ user: enrichedUser });
    return enrichedUser;
  } catch (error) {
    console.warn("[AuthService] Session restore failed:", error?.message);
    clearAuthSession();
    return null;
  }
}

/**
 * Attempt to silently refresh the access token.
 * @returns {Promise<boolean>}
 */
export async function silentRefresh() {
  try {
    const { accessToken, expiresAt } = await authApi.refreshToken();
    persistAuthSession({ accessToken, expiry: expiresAt });
    return true;
  } catch (error) {
    console.warn("[AuthService] Silent refresh failed:", error?.message);
    return false;
  }
}

// ─── 3. User Profile Builder ──────────────────────────────────────────────────

function buildUserProfile(rawUser, permissions) {
  return {
    id:          rawUser.id,
    name:        rawUser.name,
    email:       rawUser.email,
    role:        rawUser.role,
    avatar:      rawUser.avatar      ?? null,
    photoUrl:    rawUser.photoUrl    ?? null,
    department:  rawUser.department  ?? null,
    permissions,
    initials:    getInitials(rawUser.name),
    isAdmin:     rawUser.role === ROLES.ADMIN,
    isFaculty:   rawUser.role === ROLES.FACULTY,
    isStudent:   rawUser.role === ROLES.STUDENT,
    isStaff:     rawUser.role === ROLES.STAFF,
    sessionAt:   new Date().toISOString(),
  };
}

// ─── 4. Permission Helpers ────────────────────────────────────────────────────

export function resolvePermissions(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(user, permission) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}

export function hasAllPermissions(user, permissions) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return permissions.every((p) => user.permissions.includes(p));
}

export function hasAnyPermission(user, permissions) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasRole(user, role) {
  if (!user?.role) return false;
  if (Array.isArray(role)) return role.includes(user.role);
  return user.role === role;
}

// ─── 5. Token Utilities ───────────────────────────────────────────────────────

export function decodeTokenPayload() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const parts  = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function getTokenExpiryMinutes() {
  const payload = decodeTokenPayload();
  if (!payload?.exp) return 0;
  const remaining = payload.exp * 1000 - Date.now();
  return remaining > 0 ? Math.floor(remaining / 60_000) : 0;
}

// ─── 6. Utility Helpers ───────────────────────────────────────────────────────

function getInitials(name) {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function formatRole(role) {
  const labels = {
    [ROLES.ADMIN]:   "Administrator",
    [ROLES.FACULTY]: "Faculty",
    [ROLES.STUDENT]: "Student",
    [ROLES.STAFF]:   "Staff",
  };
  return labels[role] ?? "Unknown";
}

export function getRoleBadgeClasses(role) {
  const palette = {
    [ROLES.ADMIN]:   { bg: "bg-purple-100",  text: "text-purple-700"  },
    [ROLES.FACULTY]: { bg: "bg-blue-100",    text: "text-blue-700"    },
    [ROLES.STUDENT]: { bg: "bg-emerald-100", text: "text-emerald-700" },
    [ROLES.STAFF]:   { bg: "bg-amber-100",   text: "text-amber-700"   },
  };
  return palette[role] ?? { bg: "bg-slate-100", text: "text-slate-600" };
}


// ✅ ADD AT END OF FILE:

export async function forgotPassword(email) {
  await authApi.forgotPassword(email);  // ✅
}

export async function resetPassword({ email, otpCode, newPassword }) {
  await authApi.resetPassword({ email, otpCode, newPassword }); // ✅
}