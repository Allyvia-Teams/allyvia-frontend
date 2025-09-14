// src/api/axios.ts
/*import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access") ||
    "";

  const roleId = localStorage.getItem("activeRoleId") || "";

  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  if (roleId) (config.headers as any)["X-Role-ID"] = roleId;

  return config;
});

export default api;*/
export { default } from '../utils/axios';
export * from '../utils/axios';
