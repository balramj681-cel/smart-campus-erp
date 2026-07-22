import api from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://10.212.45.8:8080/api";

export function photoUrl(filename) {
  return filename ? `${BASE_URL}/profile/photo/${filename}` : null;
}

export const profileService = {
  getMe:           ()     => api.get("/profile/me"),
  updateProfile:   (data) => api.put("/profile", data),
  changePassword:  (data) => api.put("/profile/password", data),
  uploadPhoto:     (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/profile/photo", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};