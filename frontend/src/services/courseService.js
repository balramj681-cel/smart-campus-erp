import api from "./api";

// ─── Academic year helper ──────────────────────────────────────────────────────
export function currentAcademicYear() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;   // 1-12
  return month >= 7
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

export const courseService = {

  // ── Subjects ───────────────────────────────────────────────────────────────
  getSubjects: ({ page = 0, size = 10, search = "", semesterId = "" } = {}) => {
    const params = { page, size };
    if (search)     params.search     = search;
    if (semesterId) params.semesterId = semesterId;
    return api.get("/courses/subjects", { params });
  },
  getSubjectsBySemester: (semesterId) =>
    api.get(`/courses/subjects/by-semester/${semesterId}`),
  createSubject: (data)       => api.post("/courses/subjects", data),
  updateSubject: (id, data)   => api.put(`/courses/subjects/${id}`, data),
  deleteSubject: (id)         => api.delete(`/courses/subjects/${id}`),

  // ── Assignments ────────────────────────────────────────────────────────────
  getAssignments: ({ page = 0, size = 10, academicYear = "", subjectId = "", sectionId = "", facultyId = "" } = {}) => {
    const params = { page, size };
    if (academicYear) params.academicYear = academicYear;
    if (subjectId)    params.subjectId    = subjectId;
    if (sectionId)    params.sectionId    = sectionId;
    if (facultyId)    params.facultyId    = facultyId;
    return api.get("/courses/assignments", { params });
  },
  createAssignment: (data) => api.post("/courses/assignments", data),
  deleteAssignment: (id)   => api.delete(`/courses/assignments/${id}`),
};