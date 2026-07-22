import api from "./api";

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const reportService = {
  async downloadStudentsExcel(batch) {
    const blob = await api.get("/reports/students/excel", { params: { batch }, responseType: "blob" });
    downloadBlob(blob, `students${batch ? `_batch${batch}` : ""}.xlsx`);
  },

  async downloadStudentsPdf(batch) {
    const blob = await api.get("/reports/students/pdf", { params: { batch }, responseType: "blob" });
    downloadBlob(blob, `students${batch ? `_batch${batch}` : ""}.pdf`);
  },

  async downloadFeeCollectionExcel(from, to) {
    const blob = await api.get("/reports/fee-collection/excel", { params: { from, to }, responseType: "blob" });
    downloadBlob(blob, `fee_collection_${from}_to_${to}.xlsx`);
  },

  async downloadAttendanceExcel(sectionId, academicYear) {
    const blob = await api.get("/reports/attendance/excel", {
      params: { sectionId, academicYear },
      responseType: "blob",
    });
    downloadBlob(blob, `attendance_summary_${academicYear.replace("/", "-")}.xlsx`);
  },
};