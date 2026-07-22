import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const analyticsService = {
  getAdminAnalytics:   (year = currentAcademicYear()) =>
    api.get("/analytics/admin",   { params: { academicYear: year } }),
  getStudentAnalytics: (year = currentAcademicYear()) =>
    api.get("/analytics/student", { params: { academicYear: year } }),
  getFacultyAnalytics: (year = currentAcademicYear()) =>
    api.get("/analytics/faculty", { params: { academicYear: year } }),
};

// Chart colors
export const CHART_COLORS = [
  "#6366f1","#8b5cf6","#3b82f6","#06b6d4",
  "#10b981","#f59e0b","#ef4444","#ec4899",
];

export const fmt = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })}`;