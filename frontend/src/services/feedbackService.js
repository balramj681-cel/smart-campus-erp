import api from "./api";

export const feedbackService = {
  getPending:      (params = {}) => api.get("/feedback/pending",  { params }),
  getMySubmitted:  ()             => api.get("/feedback/my"),
  submit:          (data)         => api.post("/feedback", data),
  getMySummary:    ()             => api.get("/feedback/my-summary"),
  getForAssignment:(assignmentId) => api.get(`/feedback/assignment/${assignmentId}`),
  getAdminOverview:()             => api.get("/feedback/admin-overview"),
};