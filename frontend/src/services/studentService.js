import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const studentService = {
  // Admin endpoints
  getAll: ({ page = 0, size = 10, search = "", batch = "" } = {}) => {
    const params = { page, size };
    if (search) params.search = search;
    if (batch)  params.batch  = batch;
    return api.get("/students", { params });
  },
  getById:       (id)         => api.get(`/students/${id}`),
  create:        (data)       => api.post("/students", data),
  update:        (id, data)   => api.put(`/students/${id}`, data),
  assignSection: (id, sectionId) =>
    api.patch(`/students/${id}/assign-section`, { sectionId }),
  removeSection: (id)         => api.patch(`/students/${id}/remove-section`),
  delete:        (id)         => api.delete(`/students/${id}`),

  // ── Student self-service ───────────────────────────────────────────────────
  getMyProfile:    ()     => api.get("/students/my-profile"),
  getMyAttendance: (year) => api.get("/attendance/my-attendance", { params: { academicYear: year } }),
  getMyResults:    (year) => api.get("/marks/my-results", { params: { academicYear: year } }),
  getMyFees:       ()     => api.get("/fees/my-records"),
  getMyTimetable:  (year) => api.get("/timetable/my-timetable", { params: { academicYear: year } }),
  getMyExams:      (year) => api.get("/exams/my-exams", { params: { academicYear: year } }),
  getMyNotices:    ()     => api.get("/notices"),
  linkExistingUser: (userId, data) => api.post(`/students/link/${userId}`, data),
};