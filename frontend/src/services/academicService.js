import api from "./api";

export const academicService = {

  // ── Departments ────────────────────────────────────────────────────────────
  getDepartments:   ()        => api.get("/academic/departments"),
  createDepartment: (data)    => api.post("/academic/departments", data),
  updateDepartment: (id, data)=> api.put(`/academic/departments/${id}`, data),
  deleteDepartment: (id)      => api.delete(`/academic/departments/${id}`),

  // ── Programs ───────────────────────────────────────────────────────────────
  getPrograms:   (departmentId) =>
    api.get("/academic/programs", { params: departmentId ? { departmentId } : {} }),
  createProgram: (data)         => api.post("/academic/programs", data),
  updateProgram: (id, data)     => api.put(`/academic/programs/${id}`, data),
  deleteProgram: (id)           => api.delete(`/academic/programs/${id}`),

  // ── Semesters ──────────────────────────────────────────────────────────────
  getSemesters:   (programId)  => api.get("/academic/semesters", { params: { programId } }),
  createSemester: (data)       => api.post("/academic/semesters", data),
  updateSemester: (id, data)   => api.put(`/academic/semesters/${id}`, data),
  deleteSemester: (id)         => api.delete(`/academic/semesters/${id}`),

  // ── Sections ───────────────────────────────────────────────────────────────
  getSections:   (semesterId)  => api.get("/academic/sections", { params: { semesterId } }),
  createSection: (data)        => api.post("/academic/sections", data),
  updateSection: (id, data)    => api.put(`/academic/sections/${id}`, data),
  deleteSection: (id)          => api.delete(`/academic/sections/${id}`),
};