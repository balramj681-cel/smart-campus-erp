import api from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://10.212.45.8:8080/api";

export function photoUrl(filename) {
  if (!filename) return null;
  // Naya storage (ImageKit) ab poora URL deta hai — usse seedha use karo.
  // Purana local-disk pattern (bare filename) backward-compat ke liye rakha hai.
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }
  return `${BASE_URL}/profile/photo/${filename}`;
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