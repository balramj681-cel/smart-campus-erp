import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const STATUS_CONFIG = {
  PRESENT: { label: "P", fullLabel: "Present", color: "bg-green-500  text-white", light: "bg-green-50  text-green-700  border-green-300" },
  LATE:    { label: "L", fullLabel: "Late",    color: "bg-amber-500  text-white", light: "bg-amber-50  text-amber-700  border-amber-300" },
  ABSENT:  { label: "A", fullLabel: "Absent",  color: "bg-red-500    text-white", light: "bg-red-50    text-red-700    border-red-300"   },
};

export const SUMMARY_STATUS = {
  SAFE:     { label: "Safe",     color: "bg-green-100 text-green-700" },
  AT_RISK:  { label: "At Risk",  color: "bg-amber-100 text-amber-700" },
  DETAINED: { label: "Detained", color: "bg-red-100   text-red-700"   },
};

export const attendanceService = {
  // Bug 2: Faculty ka auto-schedule
  getMySchedule: (date, academicYear) =>
    api.get("/attendance/my-schedule", { params: { date, academicYear } }),

  getStudents:   (sectionId)       => api.get(`/attendance/students/${sectionId}`),
  mark:          (data)            => api.post("/attendance/sessions", data),
  update:        (id, data)        => api.put(`/attendance/sessions/${id}`, data),  // Bug 3: edit
  getSessions:   (params = {})     => api.get("/attendance/sessions", { params }),
  getMySessions: (params = {}) => api.get("/attendance/my-sessions", { params }),
  getSession:    (id)              => api.get(`/attendance/sessions/${id}`),
  deleteSession: (id)              => api.delete(`/attendance/sessions/${id}`),
  getSummary:    (sectionId, year) =>
    api.get("/attendance/summary", { params: { sectionId, academicYear: year } }),
};

// Bug 8 & 9: Debarment
export const debarmentService = {
  debar: (studentId, sectionId, subjectId, academicYear, reason = "Low attendance") =>
    api.post("/exams/debar", null, { params: { studentId, sectionId, subjectId, academicYear, reason } }),
  lift: (studentId, sectionId, subjectId, academicYear) =>
    api.delete("/exams/debar", { params: { studentId, sectionId, subjectId, academicYear } }),
};


