import api from "./api";

export const CATEGORY_CONFIG = {
  GENERAL:  { label: "General",  emoji: "📢", color: "bg-slate-100  text-slate-700",  border: "border-slate-300"  },
  ACADEMIC: { label: "Academic", emoji: "📚", color: "bg-blue-100   text-blue-700",   border: "border-blue-300"   },
  EXAM:     { label: "Exam",     emoji: "📝", color: "bg-violet-100 text-violet-700", border: "border-violet-300" },
  FEE:      { label: "Fee",      emoji: "💰", color: "bg-amber-100  text-amber-700",  border: "border-amber-300"  },
  EVENT:    { label: "Event",    emoji: "🎉", color: "bg-green-100  text-green-700",  border: "border-green-300"  },
  HOLIDAY:  { label: "Holiday",  emoji: "🏖️", color: "bg-sky-100    text-sky-700",    border: "border-sky-300"    },
  URGENT:   { label: "Urgent",   emoji: "🚨", color: "bg-red-100    text-red-700",    border: "border-red-300"    },
};

export const VISIBILITY_CONFIG = {
  ALL:           { label: "Everyone",     icon: "🌐" },
  STUDENTS_ONLY: { label: "Students Only",icon: "🎓" },
  FACULTY_ONLY:  { label: "Faculty Only", icon: "👨‍🏫" },
  ADMIN_ONLY:    { label: "Admins Only",  icon: "🔒" },
};

export const CATEGORIES    = Object.keys(CATEGORY_CONFIG);
export const VISIBILITIES  = Object.keys(VISIBILITY_CONFIG);

export const noticeService = {
  getAll:   (params = {})  => api.get("/notices",        { params }),
  getPinned:()             => api.get("/notices/pinned"),
  getById:  (id)           => api.get(`/notices/${id}`),
  create:   (data)         => api.post("/notices",        data),
  update:   (id, data)     => api.put(`/notices/${id}`,  data),
  togglePin:(id)           => api.patch(`/notices/${id}/toggle-pin`),
  toggleActive:(id)        => api.patch(`/notices/${id}/toggle-active`),
  delete:   (id)           => api.delete(`/notices/${id}`),
};