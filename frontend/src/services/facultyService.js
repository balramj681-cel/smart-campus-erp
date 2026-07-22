import api from "./api";

export const facultyService = {
  getAll: ({ page = 0, size = 10, search = "", departmentId = "", designation = "" } = {}) => {
    const params = { page, size };
    if (search)       params.search       = search;
    if (departmentId) params.departmentId = departmentId;
    if (designation)  params.designation  = designation;
    return api.get("/faculty", { params });
  },

  search: ({ q = "", page = 0, size = 10 } = {}) =>
    api.get("/faculty", {
        params: {
            page,
            size,
            search: q
        }
    }).then(res => res.data),

  getById:      (id)       => api.get(`/faculty/${id}`),
  create:       (data)     => api.post("/faculty", data),
  update:       (id, data) => api.put(`/faculty/${id}`, data),
  toggleActive: (id)       => api.patch(`/faculty/${id}/toggle-active`),
  delete:       (id)       => api.delete(`/faculty/${id}`),
  linkExistingUser: (userId, data) => api.post(`/faculty/link/${userId}`, data),
};