import api from "./api";

export const SUBMISSION_STATUS_CONFIG = {
  SUBMITTED: { label: "Submitted",      emoji: "📤", color: "bg-blue-100  text-blue-700"  },
  LATE:      { label: "Late Submission",emoji: "⏰", color: "bg-amber-100 text-amber-700" },
  GRADED:    { label: "Graded",         emoji: "✅", color: "bg-green-100 text-green-700" },
};

export const courseworkService = {
  // ── Assignments (faculty/admin) ─────────────────────────────────────────
  getAssignments:      (params = {}) => api.get("/coursework/assignments", { params }),
  getMyCreatedAssignments: (params = {}) => api.get("/coursework/assignments/my-created", { params }),
  getAssignmentById:   (id)          => api.get(`/coursework/assignments/${id}`),

  // Assignment creation is mixed JSON + optional file. "data" is sent as a
  // JSON blob part (so Spring's @RequestPart can deserialize it into
  // CreateAssignmentRequest) and "file" is the optional question-paper
  // attachment.
  // NOTE: the api instance sets a default "Content-Type: application/json"
  // header on every request. Axios only auto-generates the correct
  // "multipart/form-data; boundary=..." header for FormData bodies when
  // Content-Type ISN'T already set — so here we must explicitly unset it
  // (headers: { "Content-Type": undefined }) to let that auto-detection
  // kick in. Without this, the request goes out as application/json with
  // a FormData body and the backend rejects it (415).
  createAssignment: (data, file) => {
    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
    if (file) formData.append("file", file);
    return api.post("/coursework/assignments", formData, {
      headers: { "Content-Type": undefined },
    });
  },

  updateAssignment:    (id, data)    => api.put(`/coursework/assignments/${id}`, data),
  toggleActive:        (id)          => api.patch(`/coursework/assignments/${id}/toggle-active`),
  deleteAssignment:    (id)          => api.delete(`/coursework/assignments/${id}`),
  getMyTeachingLoad:   (academicYear) =>
    api.get("/coursework/assignments/my-teaching-load", { params: { academicYear } }),

  async downloadAssignmentAttachment(id, filename) {
    const blob = await api.get(`/coursework/assignments/${id}/attachment/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Assignments (student) ───────────────────────────────────────────────
  getMyAssignments: (academicYear) =>
    api.get("/coursework/assignments/my", { params: { academicYear } }),

  // ── Submissions ──────────────────────────────────────────────────────────
  submit: (assignmentId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    // Same fix as createAssignment above: unset the instance's default
    // "application/json" Content-Type so axios can auto-generate the
    // correct multipart boundary header for this FormData body.
    return api.post(`/coursework/submissions/${assignmentId}`, formData, {
      headers: { "Content-Type": undefined },
    });
  },

  getSubmissionsForAssignment: (assignmentId) =>
    api.get(`/coursework/submissions/assignment/${assignmentId}`),

  getMySubmissions: () => api.get("/coursework/submissions/my"),

  gradeSubmission: (id, data) => api.patch(`/coursework/submissions/${id}/grade`, data),

  async downloadSubmission(id, filename) {
    const blob = await api.get(`/coursework/submissions/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? "submission";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};