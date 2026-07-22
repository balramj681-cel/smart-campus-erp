import api from "./api";
import { currentAcademicYear } from "./courseService";

export { currentAcademicYear };

// ── Period presets (backend se match karo) ────────────────────────────────────
export const PERIODS = [
  { number: 1, label: "Period 1", start: "09:00", end: "09:50" },
  { number: 2, label: "Period 2", start: "09:50", end: "10:40" },
  { number: 3, label: "Period 3", start: "10:40", end: "11:30" },
  { number: 4, label: "Period 4", start: "11:45", end: "12:35" },
  { number: 5, label: "Period 5", start: "12:35", end: "13:25" },
  { number: 6, label: "Period 6", start: "14:00", end: "14:50" },
  { number: 7, label: "Period 7", start: "14:50", end: "15:40" },
  { number: 8, label: "Period 8", start: "15:40", end: "16:30" },
];

export const DAYS = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];

export const DAY_SHORT = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
};

// .toISOString() UTC mein convert karta hai — IST (UTC+5:30) mein local
// midnight ki date isse EK DIN PEECHE shift ho jaati hai. Ye helper local
// date components (year/month/day) use karta hai, koi timezone shift nahi.
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Deterministic color per subject code
export function subjectColor(code = "") {
  const palette = [
    ["bg-blue-100   border-blue-300   text-blue-800", "bg-blue-500"],
    ["bg-violet-100 border-violet-300 text-violet-800", "bg-violet-500"],
    ["bg-emerald-100 border-emerald-300 text-emerald-800", "bg-emerald-500"],
    ["bg-amber-100  border-amber-300  text-amber-800", "bg-amber-500"],
    ["bg-rose-100   border-rose-300   text-rose-800", "bg-rose-500"],
    ["bg-sky-100    border-sky-300    text-sky-800", "bg-sky-500"],
    ["bg-orange-100 border-orange-300 text-orange-800", "bg-orange-500"],
    ["bg-pink-100   border-pink-300   text-pink-800", "bg-pink-500"],
  ];
  let hash = 0;
  for (const c of code) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[hash % palette.length];
}

export const timetableService = {
  getForSection: (sectionId, academicYear, weekOf) => api.get(`/timetable/section/${sectionId}`, { params: { academicYear, weekOf } }),
  cancelForWeek: (id, weekOf) => api.post(`/timetable/${id}/cancel-week`, null, { params: { weekOf } }),

  

  getForFaculty: (facultyId, academicYear, weekOf) =>
    api.get(`/timetable/faculty/${facultyId}`, { params: { academicYear, weekOf } }),

  getForDate: (sectionId, date, academicYear) =>
    api.get("/timetable/by-date", { params: { sectionId, date, academicYear } }),

  create: (data) => api.post("/timetable", data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`),

  getExamsForDate: (sectionId, date, academicYear) =>
    api.get("/exams/by-date", { params: { sectionId, date, academicYear } }),

 getMyTimetable: (academicYear, weekOf) => api.get("/timetable/my-timetable", { params: { academicYear: academicYear, weekOf } }),
};