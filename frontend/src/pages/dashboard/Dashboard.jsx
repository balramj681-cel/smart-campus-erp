import { useAuth } from "../../hooks/useAuth";

import AdminDashboard from "../admin/AdminDashboard";
import FacultyDashboard from "../faculty/FacultyDashboard";
import StudentDashboard from "../student/StudentDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  const role = (user?.role || "").toLowerCase();

  switch (role) {

    case "admin":
    case "super_admin":
      return <AdminDashboard user={user} />;

    case "faculty":
    case "hod":
      return <FacultyDashboard user={user} />;

    case "student":
    default:
      return <StudentDashboard user={user} />;
  }
}