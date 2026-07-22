import api from "./api";

export const userService = {

  getAll: ({ page = 0, size = 10, search = "", role = "", active = "" } = {}) => {
    const params = { page, size };
    if (search) params.search = search;
    if (role)   params.role   = role;
    if (active !== "") params.active = active;
    return api.get("/users", { params });
  },

  getById: (id) => api.get(`/users/${id}`),

  create: (data) => api.post("/users", data),

  update: (id, data) => api.put(`/users/${id}`, data),

  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),

  delete: (id) => api.delete(`/users/${id}`),
};