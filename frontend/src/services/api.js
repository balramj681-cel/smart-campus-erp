/**
 * @file api.js
 * @description Production-ready Axios instance for Smart Campus ERP.
 *
 * RESPONSIBILITIES:
 *   1. Single configured Axios instance — one base URL, one timeout, one
 *      Content-Type. Every service module imports THIS, not raw axios.
 *   2. Request interceptor  — automatically attaches the JWT to every
 *      outgoing request so no service/component has to do it manually.
 *   3. Response interceptor — catches 401 errors, attempts a silent token
 *      refresh, replays the original request, and only redirects to /login
 *      if the refresh itself fails.
 *   4. Error normalisation  — every API error is converted to a consistent
 *      shape so the UI never has to guess the error structure.
 *   5. Auth API surface     — thin wrappers around the auth endpoints
 *      (/login, /logout, /refresh, /me) that are consumed by AuthContext.
 *
 * ARCHITECTURE NOTES:
 *   - No component logic lives here. This is a pure service layer.
 *   - The file is intentionally split into clearly labelled sections so
 *     future engineers can find things without reading everything.
 *   - "No backend calls yet" mode: mock responses are returned when
 *     VITE_USE_MOCK_API=true (set in .env.development). Flip the flag and
 *     every call hits the real server — zero changes to AuthContext or UI.
 */

import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setTokenExpiry,
  clearAuthSession,
  isTokenExpired,
} from "../utils/storage";

// ─── 1. Environment Configuration ────────────────────────────────────────────

/**
 * Base URL is read from Vite's env system.
 * Set VITE_API_BASE_URL in .env.* files — never hardcode it here.
 *
 * .env.development  →  VITE_API_BASE_URL=http://localhost:8000/api
 * .env.production   →  VITE_API_BASE_URL=https://api.smartcampus.edu/v1
 */
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://10.212.45.8:8080/api";
/**
 * When true, all auth endpoints return mock data instead of hitting the
 * network. Safe to flip in production (value will be undefined → false).
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";

/** How long to wait for a response before considering the request timed out. */
const TIMEOUT_MS = 15_000;

// ─── 2. Axios Instance ───────────────────────────────────────────────────────

/**
 * The single shared Axios instance used across the entire application.
 *
 * WHY A SHARED INSTANCE:
 *   Creating `axios.create()` once lets us configure base URL, headers, and
 *   interceptors in one place. If we ever need to point at a different API
 *   version or add a second microservice, we create a second instance here
 *   rather than scattering config throughout the codebase.
 */
const api = axios.create({
  baseURL: BASE_URL,

  timeout: TIMEOUT_MS,

  headers: {
    // Most ERP endpoints exchange JSON — set it globally so individual
    // calls don't need to repeat it. File-upload endpoints can override
    // with multipart/form-data per-request.
    "Content-Type": "application/json",

    // Helps the server identify requests from this specific client.
    "X-Client": "SmartCampusERP-Web",
  },
});

// ─── 3. Request Interceptor — Attach JWT ─────────────────────────────────────

/**
 * Runs BEFORE every outgoing request.
 *
 * What it does:
 *   a) Reads the current access token from storage.
 *   b) If one exists, injects it as a Bearer token in the Authorization
 *      header — the standard JWT transport mechanism.
 *   c) If the token is expired (checked locally, no network call), this
 *      interceptor still attaches it; the RESPONSE interceptor handles the
 *      resulting 401 and refreshes before retrying.
 *
 * Why inject here instead of per-request:
 *   Calling `api.get("/students", { headers: { Authorization: ... } })`
 *   in every service function is repetitive and easy to forget. Centralising
 *   it here means no service ever thinks about tokens.
 */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // Attach a timestamp so we can measure request latency in the response
    // interceptor (useful for performance monitoring later).
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    // Request setup failed (e.g. invalid URL) — normalise and reject
    return Promise.reject(normaliseError(error));
  }
);

// ─── 4. Token Refresh Logic ──────────────────────────────────────────────────

/**
 * Tracks whether a token refresh is currently in flight.
 * Prevents multiple simultaneous 401 responses each triggering their own
 * refresh call ("refresh storm").
 */
let isRefreshing = false;

/**
 * Queue of request callbacks waiting for the refresh to complete.
 * When the refresh succeeds, each callback is called with the new token
 * so the original requests can be replayed.
 *
 * @type {Array<{ resolve: Function, reject: Function }>}
 */
let refreshSubscribers = [];

/**
 * Add a pending request to the queue. Called when a 401 arrives and a
 * refresh is already in progress.
 *
 * @param {Function} resolve - Call with new token to replay the request.
 * @param {Function} reject  - Call with error to fail the request.
 */
function subscribeToRefresh(resolve, reject) {
  refreshSubscribers.push({ resolve, reject });
}

/**
 * Notify all queued requests after a refresh attempt.
 *
 * @param {string|null} newToken - New access token, or null on failure.
 * @param {Error|null}  error    - Error on failure, or null on success.
 */
function notifyRefreshSubscribers(newToken, error) {
  refreshSubscribers.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken);
  });
  refreshSubscribers = []; // Reset queue
}

// ─── 5. Response Interceptor — 401 Handling & Error Normalisation ─────────────

/**
 * Runs AFTER every response (success or error).
 *
 * SUCCESS PATH:
 *   Returns response.data directly so callers get the payload without
 *   always destructuring `.data`.
 *
 * ERROR PATH (401 Unauthorized):
 *   1. Checks if we have a refresh token.
 *   2. If yes: calls the refresh endpoint, stores the new access token,
 *              replays the original failed request with it.
 *   3. If the refresh also fails (refresh token expired / revoked):
 *      clears the entire auth session and redirects to /login.
 *
 * ERROR PATH (other):
 *   Converts every Axios error to a consistent AppError shape so the UI
 *   only needs to handle one error format.
 */
api.interceptors.response.use(
  // ── Success handler ──
  (response) => {
    // Optional: log latency in development
    if (import.meta.env.DEV && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      console.debug(
        `[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${duration}ms`
      );
    }

    // Return the data payload directly.
    // Callers can do: const { user } = await api.get("/me")
    // instead of:     const { data: { user } } = await api.get("/me")
    return response.data;
  },

  // ── Error handler ──
  async (error) => {
    const originalRequest = error.config;

    // ── 401: Try to refresh the access token ──
    if (error.response?.status === 401 && !originalRequest._retried) {
      const refreshToken = getRefreshToken();

      // No refresh token available — can't recover, force logout
      if (!refreshToken) {
        clearAuthSession();
        redirectToLogin();
        return Promise.reject(normaliseError(error));
      }

      // Mark this request so we don't retry it more than once
      originalRequest._retried = true;

      // ── Queue management: if refresh is already in flight ──
      if (isRefreshing) {
        // Return a promise that resolves when the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          subscribeToRefresh(
            (newToken) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            },
            reject
          );
        });
      }

      // ── We are the first 401 — kick off the refresh ──
      isRefreshing = true;

      try {
        // Call the refresh endpoint directly with axios (not our intercepted
        // instance) to avoid triggering this interceptor recursively.
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newToken  = data.accessToken;
        const newExpiry = data.expiresAt ?? null;

        // Persist the new token
        setAccessToken(newToken);
        if (newExpiry) setTokenExpiry(newExpiry);

        // Update the default header for future requests
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

        // Unblock all queued requests
        notifyRefreshSubscribers(newToken, null);

        // Replay the original failed request
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — session is unrecoverable
        notifyRefreshSubscribers(null, refreshError);
        clearAuthSession();
        redirectToLogin();
        return Promise.reject(normaliseError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    // ── All other errors — normalise and reject ──
    return Promise.reject(normaliseError(error));
  }
);

// ─── 6. Error Normalisation ──────────────────────────────────────────────────

/**
 * Convert any Axios error (network failure, timeout, HTTP error) into a
 * consistent AppError object so the UI always deals with one shape.
 *
 * Output shape:
 * {
 *   message:    string,   // Human-readable message safe to display
 *   statusCode: number,   // HTTP status (0 for network errors)
 *   code:       string,   // Machine-readable code for programmatic handling
 *   field:      string,   // Which form field caused a validation error (422)
 *   raw:        Error,    // Original Axios error for debugging
 * }
 *
 * @param {import("axios").AxiosError} error
 * @returns {AppError}
 */
function normaliseError(error) {
  // Network failure — no response received (server down, CORS, offline)
  if (!error.response) {
    return {
      message:    "Unable to reach the server. Check your internet connection.",
      statusCode: 0,
      code:       error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
      field:      null,
      raw:        error,
    };
  }

  const { status, data } = error.response;

  // Map common HTTP status codes to user-friendly messages
  const defaultMessages = {
    400: "The request was invalid. Please check your input.",
    401: "Your session has expired. Please sign in again.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "A conflict occurred. The resource may already exist.",
    422: "Validation failed. Please review the highlighted fields.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "A server error occurred. Our team has been notified.",
    503: "The service is temporarily unavailable. Please try again shortly.",
  };

  return {
    // Prefer the server's message, fall back to our default, then generic
    message:    data?.message ?? defaultMessages[status] ?? "An unexpected error occurred.",
    statusCode: status,
    // Server-provided machine code (e.g. "INVALID_CREDENTIALS") or our fallback
    code:       data?.code ?? `HTTP_${status}`,
    // For 422 validation errors the server may indicate which field failed
    field:      data?.field ?? null,
    raw:        error,
  };
}

// ─── 7. Navigation Helper ────────────────────────────────────────────────────

/**
 * Redirect to the login page after session expiry.
 *
 * WHY NOT useNavigate():
 *   This file runs outside React's component tree so hooks aren't available.
 *   We use window.location which is reliable in all environments.
 *   A future improvement is to emit a custom DOM event that the Router
 *   listens to, allowing animated transitions even on forced logouts.
 *
 * The `?session=expired` query param lets the Login page show a contextual
 * message ("Your session expired, please sign in again.").
 */
function redirectToLogin() {
  const currentPath = window.location.pathname;

  // Don't redirect if already on /login to avoid a redirect loop
  if (currentPath === "/login") return;

  window.location.href = `/login?session=expired&from=${encodeURIComponent(currentPath)}`;
}

// ─── 8. Mock Response Helpers ────────────────────────────────────────────────

/**
 * Simulate network latency in mock mode so the UI loading states are
 * exercised during development.
 *
 * @param {number} [ms=600] - Milliseconds to wait.
 * @returns {Promise<void>}
 */
function mockDelay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fake user database for mock mode.
 * Add more roles here to test role-based access control in the UI.
 *
 * In production this data comes from the real API — this block is
 * completely bypassed when VITE_USE_MOCK_API is not "true".
 */
const MOCK_USERS = [
  {
  id: "usr_004",
  name: "Balram Jat",
  email: "student@jnu.edu",
  role: "student",
  avatar: null,
  department: "BCA Semester 4",
}
];

/** Mock JWT-shaped token (NOT cryptographically valid — dev only) */
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MOCK_PAYLOAD.MOCK_SIG";
const MOCK_REFRESH_TOKEN = "mock_refresh_token_abc123";

// ─── 9. Auth API Surface ─────────────────────────────────────────────────────

/**
 * Authentication endpoints consumed by AuthContext.
 *
 * Each function returns a normalised object so AuthContext doesn't need to
 * know whether data came from a real API or the mock layer.
 *
 * REAL API SHAPE EXPECTED:
 *   POST /auth/login    → { accessToken, refreshToken, expiresAt, user }
 *   POST /auth/logout   → { message }
 *   POST /auth/refresh  → { accessToken, expiresAt }
 *   GET  /auth/me       → { user }
 */
export const authApi = {
  /**
   * Authenticate a user with email and password.
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @param {boolean} [credentials.rememberMe]
   * @returns {Promise<{ accessToken, refreshToken, expiresAt, user }>}
   */
  async login({ email, password, rememberMe = false }) {
    if (USE_MOCK) {
      await mockDelay();

      // Find a matching mock user (password is ignored in mock mode)
      const user = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        // Simulate a 401 from the server
        const err = new Error("Invalid credentials");
        err.response = {
          status: 401,
          data: { message: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
        };
        throw normaliseError(err);
      }

      return {
        accessToken:   MOCK_TOKEN,
        refreshToken:  MOCK_REFRESH_TOKEN,
        // Token expires 1 hour from now
        expiresAt:     new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user,
        rememberMe,
      };
    }

    // Real API call — interceptors handle the Authorization header
    return api.post("/auth/login", { email, password, rememberMe });
  },

  /**
   * Invalidate the current session on the server.
   * Always clears local storage regardless of server response so the
   * user is always logged out locally even if the server call fails.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    if (USE_MOCK) {
      await mockDelay(300);
      return { message: "Logged out successfully." };
    }

    // Best-effort — don't block logout on a network failure
    try {
      return await api.post("/auth/logout", {
        refreshToken: getRefreshToken(),
      });
    } catch {
      // Silent failure: local session is cleared by AuthContext regardless
    }
  },


  // ================================================================
// api.js mein authApi object ke andar, logout() method ke BAAD
// ye 2 methods paste karo. Bas yahi 2 methods add karne hain.
// ================================================================

  /**
   * Step 1: Registration OTP bhejo.
   * Backend user banata hai (unverified) aur OTP Email + SMS bhejta hai.
   */
  async sendOtp({ fullName, email, password, phoneNumber }) {
    if (USE_MOCK) {
      await mockDelay(800);

      const exists = MOCK_USERS.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        const err = new Error("Email already registered");
        err.response = {
          status: 409,
          data: { message: "An account with this email already exists.", code: "EMAIL_ALREADY_EXISTS" },
        };
        throw normaliseError(err);
      }

      return { message: "OTP sent to your email and phone. Please verify." };
    }

    return api.post("/auth/send-otp", { fullName, email, password, phoneNumber });
  },

  /**
   * Step 2: OTP verify karo.
   * OTP sahi hone pe account verified ho jaata hai.
   */
  async verifyOtp({ email, otp }) {
    if (USE_MOCK) {
      await mockDelay(600);

      // Mock: "123456" sahi OTP hai
      if (otp !== "123456") {
        const err = new Error("Incorrect OTP");
        err.response = {
          status: 400,
          data: { message: "Incorrect OTP. 2 attempt(s) remaining.", code: "INVALID_OTP" },
        };
        throw normaliseError(err);
      }

      return { message: "Account verified successfully! Please sign in." };
    }

    return api.post("/auth/verify-otp", { email, otp });
  },


  // ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTION: api.js mein authApi object ke andar
//              logout() method ke BAAD ye register() method paste karo.
//              Sirf ye block add karna hai — baaki kuch change nahi.
// ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register a new user account.
   *
   * @param {Object} payload
   * @param {string} payload.fullName
   * @param {string} payload.email
   * @param {string} payload.password
   * @returns {Promise<{ message: string }>}
   */
  async register({ fullName, email, password }) {
    if (USE_MOCK) {
      await mockDelay(700);

      // Check for duplicate email in mock users
      const exists = MOCK_USERS.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) {
        const err = new Error("Email already registered");
        err.response = {
          status: 409,
          data: {
            message: "An account with this email already exists.",
            code: "EMAIL_ALREADY_EXISTS",
          },
        };
        throw normaliseError(err);
      }

      return { message: "Registration successful." };
    }

    // Real API call — matches POST /api/auth/register on Spring Boot
    return api.post("/auth/register", { fullName, email, password });
  },

  /**
   * Fetch the currently authenticated user's profile from the server.
   * Called on app startup to verify the stored token is still valid and
   * to get the latest user data.
   *
   * @returns {Promise<{ user: Object }>}
   */
  async getMe() {
    if (USE_MOCK) {
      await mockDelay(400);

      // In mock mode, pretend the first user is authenticated
      return { user: MOCK_USERS[0] };
    }

    return api.get("/auth/me");
  },

  /**
   * Exchange a refresh token for a new access token.
   * Normally called automatically by the response interceptor — only
   * call this manually if you have a specific reason.
   *
   * @returns {Promise<{ accessToken, expiresAt }>}
   */
  async refreshToken() {
    if (USE_MOCK) {
      await mockDelay(200);
      return {
        accessToken: MOCK_TOKEN,
        expiresAt:   new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    }

    // Use raw axios (not our instance) to bypass the request interceptor
    // and avoid an infinite loop if this call itself returns a 401.
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: getRefreshToken(),
    });

    return data;
  },

  /**
   * Request a password reset email for the given address.
   *
   * @param {string} email
   * @returns {Promise<{ message: string }>}
   */
  async forgotPassword(email) {
    if (USE_MOCK) {
      await mockDelay(500);
      return { message: "Password reset link sent. Check your inbox." };
    }

    return api.post("/auth/forgot-password", { email });
  },

  /**
   * Complete the password reset flow using the token from the email link.
   *
   * @param {Object} payload
   * @param {string} payload.token       - Reset token from the email URL.
   * @param {string} payload.newPassword
   * @returns {Promise<{ message: string }>}
   */
  /*
  async resetPassword({ token, newPassword }) {
    if (USE_MOCK) {
      await mockDelay(500);
      return { message: "Password updated successfully. Please sign in." };
    }

    return api.post("/auth/reset-password", { token, newPassword });
  }, */

  async resetPassword({ email, otpCode, newPassword }) {
  return api.post("/auth/reset-password", { email, otpCode, newPassword });
}
};

// ─── 10. Generic Resource Factory ────────────────────────────────────────────

/**
 * Create a set of standard CRUD functions for any API resource.
 * Keeps service modules DRY — each one calls createResourceApi("/students")
 * and gets list / get / create / update / remove for free.
 *
 * Example usage (in a future studentsApi.js):
 *   export const studentsApi = createResourceApi("/students");
 *   const list = await studentsApi.list({ page: 1, limit: 20 });
 *   const student = await studentsApi.get("stu_001");
 *
 * @param {string} basePath - API path segment, e.g. "/students".
 * @returns {Object} CRUD helpers bound to that path.
 */
export function createResourceApi(basePath) {
  return {
    /**
     * Fetch a paginated list of resources.
     * @param {Object} [params] - Query params: page, limit, search, filters…
     */
    list: (params = {}) => api.get(basePath, { params }),

    /**
     * Fetch a single resource by ID.
     * @param {string} id
     */
    get: (id) => api.get(`${basePath}/${id}`),

    /**
     * Create a new resource.
     * @param {Object} payload
     */
    create: (payload) => api.post(basePath, payload),

    /**
     * Replace a resource entirely (PUT semantics).
     * @param {string} id
     * @param {Object} payload
     */
    update: (id, payload) => api.put(`${basePath}/${id}`, payload),

    /**
     * Partially update a resource (PATCH semantics).
     * @param {string} id
     * @param {Object} changes - Only the fields that changed.
     */
    patch: (id, changes) => api.patch(`${basePath}/${id}`, changes),

    /**
     * Delete a resource.
     * @param {string} id
     */
    remove: (id) => api.delete(`${basePath}/${id}`),
  };
}

// ─── Default Export ──────────────────────────────────────────────────────────

/**
 * The configured Axios instance.
 * Import this in any service file that needs to make API calls.
 *
 * Usage:
 *   import api from "../services/api";
 *   const data = await api.get("/courses");
 */
export default api;