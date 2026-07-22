import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute
 * --------------------------------------------------------------------------
 * A route-guard component used as a "layout route" wrapper in React Router v7.
 *
 * Responsibility (Single Responsibility Principle):
 *   This component does exactly ONE thing — it decides whether the current
 *   user is allowed to see the nested routes rendered inside it. It has no
 *   knowledge of *what* those routes are. That keeps it reusable across every
 *   protected section of the ERP (Dashboard, Students, Faculty, Finance,
 *   Attendance, etc.) without modification.
 *
 * How it works:
 *   1. While the auth status is still being resolved (e.g. validating a JWT
 *      against the backend on app load/refresh), we show a loading state
 *      instead of prematurely redirecting a logged-in user to /login.
 *   2. If resolution finishes and the user is NOT authenticated, we redirect
 *      to /login and remember the page they were trying to reach.
 *   3. If the user IS authenticated, we render <Outlet /> — React Router's
 *      placeholder for whichever nested child route matched the URL.
 *
 * Usage (in your router configuration):
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<DashboardLayout />}>
 *       <Route path="/dashboard" element={<DashboardHome />} />
 *       ...other protected pages
 *     </Route>
 *   </Route>
 */
const ProtectedRoute = () => {
  // TODO (Backend Integration): useAuth() currently reflects local/mock auth
  // state. Once Spring Boot + JWT is wired up, this hook should expose:
  //   - isAuthenticated: derived from a valid, non-expired JWT in storage
  //   - isLoading: true while a "verify token" call (e.g. GET /api/auth/me)
  //     is in flight on initial app load
  // No changes will be needed in THIS file when that backend lands — that's
  // the point of isolating auth logic inside the hook/context layer.
  const { isAuthenticated, isLoading } = useAuth();

  // useLocation lets us remember where the user was headed, so after a
  // successful login we can send them back instead of dumping them on the
  // default dashboard route. Consumed later by the Login page via
  // `location.state?.from`.
  const location = useLocation();

  // --- 1. Auth status is still being determined ---------------------------
  // Without this guard, a fully authenticated user with a valid JWT would
  // flash a redirect to /login on every hard refresh while the token is
  // still being verified — a common bug in enterprise auth flows.
  if (isLoading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center bg-slate-50"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-500">
            Verifying your session...
          </p>
        </div>
      </div>
    );
  }

  // --- 2. Not authenticated: redirect to login -----------------------------
  // `replace` avoids polluting browser history with the protected URL, so
  // hitting "back" after redirect doesn't bounce the user between
  // /login and the protected page they were denied.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- 3. Authenticated: render the matched nested route -------------------
  return <Outlet />;
};

export default ProtectedRoute;