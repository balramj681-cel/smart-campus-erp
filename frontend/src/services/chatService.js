import api from "./api";

export const chatService = {
  searchUsers:       (q)             => api.get("/chat/users", { params: { q } }),
  getConversations:  ()              => api.get("/chat/conversations"),
  startConversation: (otherUserId)   => api.post(`/chat/conversations/${otherUserId}`),
  getMessages:       (id, params={}) => api.get(`/chat/conversations/${id}/messages`, { params }),
  sendMessage:       (id, content)   => api.post(`/chat/conversations/${id}/messages`, { content }),
  markRead:          (id)            => api.post(`/chat/conversations/${id}/read`),
  // markRead ke NEECHE ye add karo:
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  getUnreadCount:    ()              => api.get("/chat/unread-count"),
};