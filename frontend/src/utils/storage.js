/**
 * @file storage.js
 * @description Centralized, type-safe wrapper around localStorage for all
 *              authentication-related persistence in Smart Campus ERP.
 *
 * WHY THIS EXISTS:
 *   Directly calling localStorage.getItem / setItem throughout the codebase
 *   creates key-name drift, silent JSON parse failures, and makes it hard to
 *   swap the storage backend later (e.g. sessionStorage, IndexedDB, cookies).
 *   This module is the single source of truth for every storage key and
 *   operation related to auth.
 *
 * SECURITY NOTES:
 *   - JWTs stored in localStorage are readable by any JS on the page.
 *     For higher-security deployments, swap this module to use httpOnly
 *     cookies (set by the server) — no other file needs to change.
 *   - Never store passwords or sensitive PII here.
 *   - All reads are wrapped in try/catch so a corrupted store never
 *     crashes the app — it returns null and the caller decides what to do.
 */

// ─── Storage Keys ────────────────────────────────────────────────────────────
// Centralising keys prevents typo bugs across the codebase.
// If a key ever needs to change, update it once here.

const KEYS = {
  /** The signed JWT returned by the login endpoint */
  ACCESS_TOKEN: "erp_access_token",

  /**
   * Refresh token — used to silently obtain a new access token when it
   * expires, without forcing the user to log in again.
   */
  REFRESH_TOKEN: "erp_refresh_token",

  /**
   * Serialised user object: { id, name, email, role, avatar? }
   * Cached here so the UI can render immediately on page reload without
   * waiting for a /me API round-trip.
   */
  USER: "erp_user",

  /**
   * ISO timestamp string of when the access token expires.
   * Lets the app proactively refresh before the server rejects a request.
   */
  TOKEN_EXPIRY: "erp_token_expiry",

  /**
   * Boolean flag — true when the user ticked "Remember Me".
   * When false, we could migrate to sessionStorage instead (future option).
   */
  REMEMBER_ME: "erp_remember_me",
};

function getStorage(rememberMe = getRememberMe()) {
  return rememberMe ? localStorage : sessionStorage;
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

/**
 * Safely write a value to localStorage.
 * Objects / arrays are JSON-serialised automatically.
 *
 * @param {string} key   - One of the KEYS constants.
 * @param {*}      value - Any JSON-serialisable value.
 * @returns {boolean} true on success, false if storage is unavailable/full.
 */
function setItem(key, value, rememberMe = getRememberMe()) {
  try {
    const storage = getStorage(rememberMe);
    const serialised =
      typeof value === "string" ? value : JSON.stringify(value);

    storage.setItem(key, serialised);

    // Purani copy hata do
    (rememberMe ? sessionStorage : localStorage).removeItem(key);

    return true;
  } catch (err) {
    console.error(`[Storage] Failed to write key "${key}":`, err);
    return false;
  }
}

/**
 * Safely read a value from localStorage.
 * Attempts JSON.parse; if that fails, returns the raw string.
 *
 * @param {string} key - One of the KEYS constants.
 * @returns {*} Parsed value, raw string, or null if the key doesn't exist.
 */
function getItem(key) {
  try {
    let raw = localStorage.getItem(key);

    if (raw === null) {
      raw = sessionStorage.getItem(key);
    }

    if (raw === null) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    console.error(`[Storage] Failed to read key "${key}":`, err);
    return null;
  }
}

/**
 * Safely remove a single key from localStorage.
 *
 * @param {string} key - One of the KEYS constants.
 */
function removeItem(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch (err) {
    console.error(`[Storage] Failed to remove key "${key}":`, err);
  }
}

// ─── Token Operations ────────────────────────────────────────────────────────

/**
 * Persist the access token returned after a successful login.
 *
 * @param {string} token - Raw JWT string from the API.
 */
export function setAccessToken(token) {
  setItem(KEYS.ACCESS_TOKEN, token);
}

/**
 * Retrieve the stored access token.
 *
 * @returns {string|null} JWT string, or null if not authenticated.
 */
export function getAccessToken() {
  return getItem(KEYS.ACCESS_TOKEN);
}

/**
 * Remove the access token (called on logout or token invalidation).
 */
export function removeAccessToken() {
  removeItem(KEYS.ACCESS_TOKEN);
}

// ─── Refresh Token Operations ────────────────────────────────────────────────

/**
 * Persist the refresh token alongside the access token.
 * Refresh tokens are typically long-lived (days / weeks).
 *
 * @param {string} token - Refresh JWT string from the API.
 */
export function setRefreshToken(token) {
  setItem(KEYS.REFRESH_TOKEN, token);
}

/** @returns {string|null} */
export function getRefreshToken() {
  return getItem(KEYS.REFRESH_TOKEN);
}

export function removeRefreshToken() {
  removeItem(KEYS.REFRESH_TOKEN);
}

// ─── Token Expiry ────────────────────────────────────────────────────────────

/**
 * Store when the current access token expires.
 * Allows the Axios interceptor to refresh proactively (before 401 errors).
 *
 * @param {string|Date} expiry - ISO date string or Date object.
 */
export function setTokenExpiry(expiry) {
  const iso = expiry instanceof Date ? expiry.toISOString() : expiry;
  setItem(KEYS.TOKEN_EXPIRY, iso);
}

/**
 * @returns {Date|null} Expiry as a Date object, or null if not set.
 */
export function getTokenExpiry() {
  const raw = getItem(KEYS.TOKEN_EXPIRY);
  return raw ? new Date(raw) : null;
}

/**
 * Check whether the stored access token has expired (or will expire within
 * a configurable buffer window to avoid edge-case failures).
 *
 * @param {number} [bufferSeconds=30] - Treat the token as expired this many
 *                                      seconds before its actual expiry time.
 * @returns {boolean} true if token is absent or expired.
 */
export function isTokenExpired(bufferSeconds = 30) {
  const token = getAccessToken();
  if (!token) return true;

  const expiry = getTokenExpiry();
  if (!expiry) return false; // No expiry stored — assume it's still valid

  const bufferMs = bufferSeconds * 1000;
  return Date.now() >= expiry.getTime() - bufferMs;
}

// ─── User Cache ──────────────────────────────────────────────────────────────

/**
 * Cache the authenticated user object so the UI can hydrate instantly on
 * page reload without an additional API round-trip.
 *
 * Expected shape:
 * {
 *   id:     string,
 *   name:   string,
 *   email:  string,
 *   role:   "admin" | "faculty" | "student" | "staff",
 *   avatar: string | null,
 * }
 *
 * @param {Object} user - User object from the API or auth context.
 */
export function setUser(user) {
  setItem(KEYS.USER, user);
}

/**
 * @returns {Object|null} Cached user object, or null if not logged in.
 */
export function getUser() {
  return getItem(KEYS.USER);
}

export function removeUser() {
  removeItem(KEYS.USER);
}

// ─── Remember Me ─────────────────────────────────────────────────────────────

/**
 * Persist the user's "Remember Me" preference.
 * Could be used in the future to switch between localStorage and
 * sessionStorage (session-only persistence when false).
 *
 * @param {boolean} value
 */
export function setRememberMe(value) {
  setItem(KEYS.REMEMBER_ME, value);
}

/** @returns {boolean} */
export function getRememberMe() {
  return getItem(KEYS.REMEMBER_ME) === true;
}

// ─── Bulk Operations ─────────────────────────────────────────────────────────

/**
 * Persist all auth data returned after a successful login in one call.
 * Prefer this over calling each setter individually to keep the store
 * consistent (all keys written or none, conceptually).
 *
 * @param {Object} params
 * @param {string}       params.accessToken
 * @param {string}       [params.refreshToken]
 * @param {Object}       params.user
 * @param {string|Date}  [params.expiry]       - Access token expiry.
 * @param {boolean}      [params.rememberMe]
 */

export function persistAuthSession({ accessToken, refreshToken, user, expiry, rememberMe }) {
  
  if (rememberMe !== undefined) {
    setRememberMe(rememberMe);
  }

  if (accessToken) setItem(KEYS.ACCESS_TOKEN, accessToken, rememberMe);
  if (refreshToken) setItem(KEYS.REFRESH_TOKEN, refreshToken, rememberMe);
  if (user) setItem(KEYS.USER, user, rememberMe);
  if (expiry) setItem(KEYS.TOKEN_EXPIRY, expiry, rememberMe);
}

/**
 * Wipe every auth-related key from storage in one call.
 * Called on logout, token revocation, or auth errors that require re-login.
 */
export function clearAuthSession() {
  removeAccessToken();
  removeRefreshToken();
  removeUser();
  removeItem(KEYS.TOKEN_EXPIRY);
  removeItem(KEYS.REMEMBER_ME);
}

/**
 * Quick check: is there a token AND a cached user in storage?
 * Useful for determining whether to show the auth flow on initial load.
 *
 * NOTE: This does NOT verify the token's cryptographic signature —
 *       that validation must be done server-side.
 *
 * @returns {boolean}
 */
export function hasActiveSession() {
  return !!getAccessToken() && !!getUser();
}