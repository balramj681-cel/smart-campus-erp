import api from "./api";

export const NOTIFICATION_TYPE_CONFIG = {
  NOTICE:     { emoji: "📢", color: "bg-indigo-100 text-indigo-700" },
  LIBRARY:    { emoji: "📚", color: "bg-purple-100 text-purple-700" },
  FEE:        { emoji: "💰", color: "bg-amber-100  text-amber-700"  },
  ATTENDANCE: { emoji: "🗓️", color: "bg-blue-100   text-blue-700"   },
  EXAM:       { emoji: "📝", color: "bg-rose-100   text-rose-700"   },
  GENERAL:    { emoji: "🔔", color: "bg-slate-100  text-slate-700"  },
};

export const notificationService = {
  getMyNotifications: (params = {}) => api.get("/notifications", { params }),
  getUnreadCount:     ()             => api.get("/notifications/unread-count"),
  markRead:           (id)           => api.patch(`/notifications/${id}/read`),
  markAllRead:        ()             => api.patch("/notifications/read-all"),
};