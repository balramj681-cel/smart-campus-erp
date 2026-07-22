import api from "./api";

export const ISSUE_STATUS_CONFIG = {
  ISSUED:   { label: "Issued",   emoji: "📗", color: "bg-blue-100   text-blue-700"   },
  RETURNED: { label: "Returned", emoji: "✅", color: "bg-green-100  text-green-700"  },
  OVERDUE:  { label: "Overdue",  emoji: "⏰", color: "bg-red-100    text-red-700"    },
  LOST:     { label: "Lost",     emoji: "❌", color: "bg-slate-200  text-slate-700"  },
};

export const libraryService = {
  // ── Books ──────────────────────────────────────────────────────────────
  getBooks:      (params = {}) => api.get("/library/books", { params }),
  getBookById:   (id)          => api.get(`/library/books/${id}`),
  createBook:    (data)        => api.post("/library/books", data),
  updateBook:    (id, data)    => api.put(`/library/books/${id}`, data),
  toggleActive:  (id)          => api.patch(`/library/books/${id}/toggle-active`),
  deleteBook:    (id)          => api.delete(`/library/books/${id}`),

  // ── Issue / Return ─────────────────────────────────────────────────────
  issueBook:     (data)               => api.post("/library/issues", data),
  returnBook:    (issueId)            => api.patch(`/library/issues/${issueId}/return`),
  markLost:      (issueId, remarks)   =>
    api.patch(`/library/issues/${issueId}/mark-lost`, null, { params: { remarks } }),
  getIssues:     (params = {})        => api.get("/library/issues", { params }),

  // ── Student self-service ───────────────────────────────────────────────
  getMyIssues:   (params = {}) => api.get("/library/my-issues", { params }),

  // ── Stats ──────────────────────────────────────────────────────────────
  getStats:      () => api.get("/library/stats"),
};