import api from "./api";

export const LEAVE_TYPE_CONFIG = {
  CASUAL: { label: "Casual Leave", emoji: "🏖️" },
  SICK:   { label: "Sick Leave",   emoji: "🤒" },
  EARNED: { label: "Earned Leave", emoji: "📅" },
  OTHER:  { label: "Other",        emoji: "📝" },
};

export const LEAVE_STATUS_CONFIG = {
  PENDING:   { label: "Pending",   emoji: "⏳", color: "bg-amber-100 text-amber-700" },
  APPROVED:  { label: "Approved",  emoji: "✅", color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Rejected",  emoji: "❌", color: "bg-red-100   text-red-700"   },
  CANCELLED: { label: "Cancelled", emoji: "🚫", color: "bg-slate-200 text-slate-600" },
};

export const leaveService = {
  // ── Faculty self-service ──────────────────────────────────────────────
  apply:       (data)          => api.post("/leaves", data),
  getMyLeaves: (params = {})   => api.get("/leaves/my", { params }),
  cancel:      (id)            => api.patch(`/leaves/${id}/cancel`),

  // ── Admin review ───────────────────────────────────────────────────────
  getAll:  (params = {}) => api.get("/leaves", { params }),
  review:  (id, data)    => api.patch(`/leaves/${id}/review`, data),
  getStats: ()           => api.get("/leaves/stats"),
};