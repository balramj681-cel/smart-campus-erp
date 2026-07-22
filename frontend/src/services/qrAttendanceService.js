import api from "./api";

export const qrAttendanceService = {
  start:     (data)      => api.post("/attendance/qr/start", data),
  progress:  (sessionId)  => api.get(`/attendance/qr/${sessionId}/progress`),
  scan:      (token)      => api.post(`/attendance/qr/scan/${token}`),
  finalize:  (sessionId)  => api.post(`/attendance/qr/${sessionId}/finalize`),
};