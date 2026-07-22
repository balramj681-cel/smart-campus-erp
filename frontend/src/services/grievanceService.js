import api from "./api";

export const CATEGORY_CONFIG = {
  ACADEMIC:        { label: "Academic",        emoji: "📚", color: "bg-blue-100    text-blue-700"    },
  EXAMINATION:     { label: "Examination",     emoji: "📝", color: "bg-violet-100  text-violet-700"  },
  FEE:             { label: "Fee",             emoji: "💰", color: "bg-amber-100   text-amber-700"   },
  LIBRARY:         { label: "Library",         emoji: "📖", color: "bg-teal-100    text-teal-700"    },
  FACULTY_CONDUCT: { label: "Faculty Conduct", emoji: "🧑‍🏫", color: "bg-rose-100    text-rose-700"    },
  INFRASTRUCTURE:  { label: "Infrastructure",  emoji: "🏢", color: "bg-slate-100   text-slate-700"   },
  HOSTEL:          { label: "Hostel",          emoji: "🏠", color: "bg-green-100   text-green-700"   },
  HARASSMENT:      { label: "Harassment",      emoji: "🚫", color: "bg-red-100     text-red-700"     },
  OTHER:           { label: "Other",           emoji: "📌", color: "bg-slate-100   text-slate-700"   },
};

export const PRIORITY_CONFIG = {
  LOW:    { label: "Low",    emoji: "🟢", color: "bg-green-100  text-green-700"  },
  MEDIUM: { label: "Medium", emoji: "🟡", color: "bg-amber-100  text-amber-700"  },
  HIGH:   { label: "High",   emoji: "🟠", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", emoji: "🔴", color: "bg-red-100    text-red-700"    },
};

export const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     emoji: "⏳", color: "bg-slate-100  text-slate-700"  },
  IN_PROGRESS: { label: "In Progress", emoji: "🔄", color: "bg-blue-100   text-blue-700"   },
  RESOLVED:    { label: "Resolved",    emoji: "✅", color: "bg-green-100  text-green-700"  },
  REJECTED:    { label: "Rejected",    emoji: "❌", color: "bg-red-100    text-red-700"    },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);
export const PRIORITIES = Object.keys(PRIORITY_CONFIG);
export const STATUSES   = Object.keys(STATUS_CONFIG);

export const grievanceService = {
  getMy:        (params = {}) => api.get("/grievances/my",  { params }),
  getAll:       (params = {}) => api.get("/grievances",     { params }),
  getStats:     ()            => api.get("/grievances/stats"),
  getById:      (id)          => api.get(`/grievances/${id}`),
  create:       (data)        => api.post("/grievances",    data),
  updateStatus: (id, data)    => api.patch(`/grievances/${id}/status`, data),
  delete:       (id)          => api.delete(`/grievances/${id}`),
};