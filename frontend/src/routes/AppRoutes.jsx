import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

/* ─── Auth Pages ─────────────────────────────────────────────────────────── */
const Login           = lazy(() => import('../pages/auth/Login'));
const Register        = lazy(() => import('../pages/auth/Register'));
const ForgotPassword  = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword   = lazy(() => import('../pages/auth/ResetPassword'));

/* ─── Layouts ────────────────────────────────────────────────────────────── */
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));

/* ─── Shared ─────────────────────────────────────────────────────────────── */
const NoticeBoardPage = lazy(() => import('../pages/shared/NoticeBoardPage'));
const ChatPage = lazy(() => import('../pages/shared/ChatPage'));
const GrievancePage   = lazy(() => import('../pages/shared/GrievancePage'));
const MyProfilePage = lazy(() => import('../pages/shared/MyProfilePage'));
const AcademicCalendarPage = lazy(() => import('../pages/shared/AcademicCalendarPage'));

/* ─── Admin / HOD Pages ──────────────────────────────────────────────────── */
const AdminDashboard        = lazy(() => import('../pages/dashboard/Dashboard'));
const UsersPage             = lazy(() => import('../pages/admin/UsersPage'));
const AcademicStructurePage = lazy(() => import('../pages/admin/AcademicStructurePage'));
const StudentsPage          = lazy(() => import('../pages/admin/StudentsPage'));
const FacultyPage           = lazy(() => import('../pages/admin/FacultyPage'));
const CoursesPage           = lazy(() => import('../pages/admin/CoursesPage'));
const TimetablePage         = lazy(() => import('../pages/admin/TimetablePage'));
const AttendancePage        = lazy(() => import('../pages/admin/AttendancePage'));
const MarksPage             = lazy(() => import('../pages/admin/MarksPage'));
const FeePage               = lazy(() => import('../pages/admin/FeePage'));
const ExaminationPage       = lazy(() => import('../pages/admin/ExaminationPage'));
const LibraryPage           = lazy(() => import('../pages/admin/LibraryPage'));
const ReportsPage           = lazy(() => import('../pages/admin/ReportsPage'));
const LeaveRequestsPage     = lazy(() => import('../pages/admin/LeaveRequestsPage'));
const FeedbackReportsPage = lazy(() => import('../pages/admin/FeedbackReportsPage'));
const DocumentCenterPage = lazy(() => import('../pages/admin/DocumentCenterPage'));


/* ─── Faculty Pages ──────────────────────────────────────────────────────── */
const FacultyDashboard      = lazy(() => import('../pages/faculty/FacultyDashboard'));
const FacultyTimetablePage  = lazy(() => import('../pages/faculty/FacultyTimetablePage'));
const FacultyAssignmentsPage = lazy(() => import('../pages/faculty/AssignmentsPage'));
const FacultyLeavePage      = lazy(() => import('../pages/faculty/LeavePage'));
const FacultyFeedbackPage = lazy(() => import('../pages/faculty/FacultyFeedbackPage'));
const QrAttendancePage = lazy(() => import('../pages/faculty/QrAttendancePage'));
// Faculty attendance + marks → same admin pages (auto-filter by role in backend)

/* ─── Student Pages ──────────────────────────────────────────────────────── */
const StudentDashboard      = lazy(() => import('../pages/student/StudentDashboard'));
const StudentAttendancePage = lazy(() => import('../pages/student/StudentAttendancePage'));
const StudentTimetablePage  = lazy(() => import('../pages/student/StudentTimetablePage'));
const StudentResultsPage    = lazy(() => import('../pages/student/StudentResultsPage'));
const StudentFeePage        = lazy(() => import('../pages/student/StudentFeePage'));
const StudentExamPage       = lazy(() => import('../pages/student/StudentExamPage'));
const StudentLibraryPage    = lazy(() => import('../pages/student/StudentLibraryPage'));
const StudentAssignmentsPage = lazy(() => import('../pages/student/StudentAssignmentsPage'));
const StudentFeedbackPage = lazy(() => import('../pages/student/StudentFeedbackPage'));
const MyDocumentsPage = lazy(() => import('../pages/student/MyDocumentsPage'));
const ScanAttendancePage = lazy(() => import('../pages/student/ScanAttendancePage'));

/* ─── Suspense Fallback ──────────────────────────────────────────────────── */
const Fallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"/>
  </div>
);

/* ─── Coming Soon ────────────────────────────────────────────────────────── */
const ComingSoon = ({ title }) => (
  <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
      <Construction className="h-8 w-8 text-indigo-600"/>
    </div>
    <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
    <p className="text-sm text-slate-500">Coming soon in next update.</p>
  </div>
);

/* ─── Role-based Dashboard ───────────────────────────────────────────────── */
function RoleDashboard() {
  const { user } = useAuth();
  const role = (user?.role ?? "").toLowerCase();
  if (role === "student")               return <StudentDashboard />;
  if (role === "faculty" || role === "hod") return <FacultyDashboard />;
  return <AdminDashboard />;
}

/* ─── App Routes ─────────────────────────────────────────────────────────── */
const AppRoutes = () => {
  const { user } = useAuth();
  const role = (user?.role ?? "").toLowerCase();

  const isAdmin   = ["admin", "super_admin"].includes(role);
  const isHod     = role === "hod";
  const isFaculty = role === "faculty";
  const isStudent = role === "student";

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            {/* Dashboard — role-based */}
            <Route path="/dashboard" element={<RoleDashboard />} />

            {/* ── Notices — all roles ── */}
            <Route path="/notices"  element={<NoticeBoardPage />} />
            <Route path="/messages" element={<ChatPage />} />
            <Route path="/grievances" element={<GrievancePage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/calendar" element={<AcademicCalendarPage />} />

            {/* ─────────────────────────────────────────────────
                ADMIN + HOD routes
            ───────────────────────────────────────────────── */}
            {(isAdmin || isHod) && <>
              <Route path="/users"             element={<UsersPage />} />
              <Route path="/academic-structure" element={<AcademicStructurePage />} />
              <Route path="/students"          element={<StudentsPage />} />
              <Route path="/faculty"           element={<FacultyPage />} />
              <Route path="/courses"           element={<CoursesPage />} />
              <Route path="/timetable"         element={<TimetablePage />} />
              <Route path="/attendance"        element={<AttendancePage />} />
              <Route path="/marks"             element={<MarksPage />} />
              <Route path="/finance"           element={<FeePage />} />
              <Route path="/examinations"      element={<ExaminationPage />} />
              <Route path="/my-timetable"      element={<TimetablePage />} />
              <Route path="/library"           element={<LibraryPage />} />
              <Route path="/reports"           element={<ReportsPage />} />
              <Route path="/leave-requests"    element={<LeaveRequestsPage />} />
              <Route path="/feedback-reports" element={<FeedbackReportsPage />} />
               <Route path="/documents" element={<DocumentCenterPage />} />
            </>}

            {/* ─────────────────────────────────────────────────
                FACULTY routes
            ───────────────────────────────────────────────── */}
            {isFaculty && <>
              <Route path="/attendance"    element={<AttendancePage />} />
              <Route path="/qr-attendance" element={<QrAttendancePage />} />
              <Route path="/assignments"   element={<FacultyAssignmentsPage />} />
              <Route path="/leave"         element={<FacultyLeavePage />} />
               <Route path="/leave"         element={<FacultyLeavePage />} />
              <Route path="/marks"         element={<MarksPage />} />
              <Route path="/timetable"     element={<FacultyTimetablePage />} />
              <Route path="/my-timetable"  element={<FacultyTimetablePage />} />
              <Route path="/examinations"  element={<ExaminationPage />} />
              <Route path="/feedback" element={<FacultyFeedbackPage />} />
            </>}

            {/* ─────────────────────────────────────────────────
                STUDENT routes (self-service)
            ───────────────────────────────────────────────── */}
            {isStudent && <>
              <Route path="/my-attendance" element={<StudentAttendancePage />} />
              <Route path="/scan-attendance" element={<ScanAttendancePage />} />
              <Route path="/scan-attendance/:token" element={<ScanAttendancePage />} />
              <Route path="/my-timetable"  element={<StudentTimetablePage />} />
              <Route path="/my-results"    element={<StudentResultsPage />} />
              <Route path="/my-fees"       element={<StudentFeePage />} />
              <Route path="/my-exams"      element={<StudentExamPage />} />
              <Route path="/timetable"     element={<StudentTimetablePage />} />
              <Route path="/attendance"    element={<StudentAttendancePage />} />
              <Route path="/marks"         element={<StudentResultsPage />} />
              <Route path="/finance"       element={<StudentFeePage />} />
              <Route path="/examinations"  element={<StudentExamPage />} />
              <Route path="/my-library"    element={<StudentLibraryPage />} />
              <Route path="/my-assignments" element={<StudentAssignmentsPage />} />
              <Route path="/my-feedback" element={<StudentFeedbackPage />} />
              <Route path="/my-documents" element={<MyDocumentsPage />} />
            </>}

            {/* Redirect unknown to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;