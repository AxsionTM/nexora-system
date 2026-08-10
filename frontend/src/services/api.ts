import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexora_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("nexora_refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, {
            refresh,
          });
          localStorage.setItem("nexora_access", data.access);
          if (data.refresh) {
            localStorage.setItem("nexora_refresh", data.refresh);
          }
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("nexora_access");
          localStorage.removeItem("nexora_refresh");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
