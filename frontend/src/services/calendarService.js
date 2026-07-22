import api from "./api";

export const EVENT_TYPE_CONFIG = {
  HOLIDAY:        { label: "Holiday",        color: "#ef4444", bg: "bg-red-100    text-red-700",    emoji: "🏖️" },
  EXAM:           { label: "Examination",    color: "#8b5cf6", bg: "bg-violet-100 text-violet-700", emoji: "📝" },
  SEMESTER_START: { label: "Semester Start", color: "#22c55e", bg: "bg-green-100  text-green-700",  emoji: "🎓" },
  SEMESTER_END:   { label: "Semester End",   color: "#f97316", bg: "bg-orange-100 text-orange-700", emoji: "🏁" },
  EVENT:          { label: "College Event",  color: "#3b82f6", bg: "bg-blue-100   text-blue-700",   emoji: "🎉" },
  SPORTS:         { label: "Sports",         color: "#06b6d4", bg: "bg-cyan-100   text-cyan-700",   emoji: "🏆" },
  CULTURAL:       { label: "Cultural",       color: "#ec4899", bg: "bg-pink-100   text-pink-700",   emoji: "🎭" },
  GENERAL:        { label: "General",        color: "#94a3b8", bg: "bg-slate-100  text-slate-600",  emoji: "📅" },
};

export const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG);

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export const calendarService = {
  getMonth:       (year, month, academicYear) =>
    api.get("/calendar/month", { params: { year, month, academicYear } }),
  getUpcoming:    () => api.get("/calendar/upcoming"),
  create:         (data) => api.post("/calendar", data),
  update:         (id, data) => api.put(`/calendar/${id}`, data),
  togglePublish:  (id) => api.patch(`/calendar/${id}/toggle-publish`),
  delete:         (id) => api.delete(`/calendar/${id}`),
};

// Get all days in a month grid (including prev/next month fillers)
export function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrev  = new Date(year, month - 1, 0).getDate();

  const cells = [];

  // Previous month filler
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 2, daysInPrev - i), current: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month - 1, d), current: true });
  }

  // Next month filler
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month, d), current: false });
  }

  return cells;
}

// Check if a date falls within event range
export function eventOnDate(event, date) {
  const d     = new Date(date); d.setHours(0,0,0,0);
  const start = new Date(event.startDate); start.setHours(0,0,0,0);
  const end   = new Date(event.endDate);   end.setHours(0,0,0,0);
  return d >= start && d <= end;
}

// Today check
export function isToday(date) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return t.getTime() === d.getTime();
}