import api from "./api";

function openPdfBlob(blob) {
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => window.URL.revokeObjectURL(url), 30000);
}

export const CERTIFICATE_TYPES = [
  { value: "BONAFIDE",          label: "Bonafide Certificate" },
  { value: "CHARACTER",         label: "Character Certificate" },
  { value: "TRANSFER",          label: "Transfer Certificate" },
  { value: "COURSE_COMPLETION", label: "Course Completion Certificate" },
];

export const documentService = {
  async downloadStudentIdCard(studentId) {
    const blob = await api.get(`/documents/id-card/student/${studentId}`, { responseType: "blob" });
    openPdfBlob(blob);
  },
  async downloadFacultyIdCard(facultyId) {
    const blob = await api.get(`/documents/id-card/faculty/${facultyId}`, { responseType: "blob" });
    openPdfBlob(blob);
  },
  async downloadMyIdCard() {
    const blob = await api.get("/documents/id-card/my", { responseType: "blob" });
    openPdfBlob(blob);
  },
  issueCertificate:   (data) => api.post("/documents/certificates", data),
  async downloadCertificate(id) {
    const blob = await api.get(`/documents/certificates/${id}/download`, { responseType: "blob" });
    openPdfBlob(blob);
  },
  getAllCertificates: (params = {}) => api.get("/documents/certificates", { params }),
  getMyCertificates:  (params = {}) => api.get("/documents/certificates/my", { params }),
};